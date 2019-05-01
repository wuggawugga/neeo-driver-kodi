'use strict';

const debug = require('debug')('neeo-driver-kodi:KodiClient');
const os = require('os');
const wol = require('wake_on_lan');
var Netmask = require('netmask').Netmask;
const WebSocket = require("ws");
//const EventEmitter = require("events");
const conf = require('./Configstore');

const CONNECTION_TIMEOUT = 10000;
const RPC_TIMEOUT = 3000;
const RECONNECT_INTERVAL = 30000;
const KEEPALIVE_INTERVAL = 30000;

const WINDOW_IDS = {
	12005: 'Fullscreen video'
};

module.exports = class KodiClient {

	constructor(id) {
		debug('CONSTRUCTOR', id);
		let service = conf.get(id);
		this._id = id;
		this._name = service.name;
		this._mac = service.mac;
		this._address = service.address;
		this._port = service.port;
		this._reachable = service.reachable;
		this._ws_uri = service.ws_uri;
		this._session;
		this._socket;
		this._eventEmitter;
		this._rpcId = 0;
		this._connected = false;
		this._sentRequests = {};
		this._connection_timeout_id;
		this._reconnect_timeout_id;
		this._keepalive_interval_id;
		this.previousWindow;
		this.currentWindow;
		debug(this.toString());
//		this._eventEmitter	= new EventEmitter();
		this.connect();
	}

	toString() {
    return 'KodiClient ' + this._id + ' ' + this._ws_uri;
  }

	wakeDevice() {
		debug('wakeDevice()', this._id, this._mac);
		if(this._address && this._mac) {
			let bc = getBroadcastAddress(this._address);
			debug('Broadcast address for', this._address, 'is', bc);
			let params = { num_packets: 3, interval: 100 };
			// Network broadcast (only working broadcast on Windows)
			params.address = bc;
			params.port = 7;
			wol.wake(this._mac, params);
			params.port = 9;
			wol.wake(this._mac, params);
			// Global broadcast
			params.address = '255.255.255.255';
			params.port = 7;
			wol.wake(this._mac, params);
			params.port = 9;
			wol.wake(this._mac, params);
			// Unicast
			params.address = this._address;
			params.port = 7;
			wol.wake(this._mac, params);
			params.port = 9;
			wol.wake(this._mac, params);
		}
	}

	connect() {
		debug('Connect()', this._ws_uri);
		if(this._socket && ( this._socket.readyState == WebSocket.CONNECTING || this._socket.readyState == WebSocket.OPEN )) {
			debug('Already connected');
			return true;
		}
		// Reachable state is maintained by lib/kodiDiscovery.js
		this._reachable = conf.get(this._id+'.reachable');
		if(!this._reachable) {
			console.log('Target ' + this._ws_uri + ' unreachable');
			this.reconnect();
			return false;
		}

		try {
			this._socket = new WebSocket(this._ws_uri);
		} catch(error) {
			debug('Connection error:', error);
			this.reconnect();
			return false;
		}

		this._connection_timeout_id = setTimeout(() => {
			debug('Connection timed out');
			setTimeout(() => this._socket.terminate(), 8);
			this.reconnect();
		}, CONNECTION_TIMEOUT);

		this._socket.on('open', () => {
			debug('Connected');
			clearTimeout(this._connection_timeout_id);
			this._connected = true;
			this._keepalive();
//			this.events.emit('connected', { mac: this.mac, eventdata: "Was not able to connect before reaching timeout." });
		});

		this._socket.on('close', () => {
			debug('Connection closed by peer');
			this._connected = false;
			this.reconnect();
//			this.events.emit("closed", { mac: this.mac, eventdata: "Connection closed." });
		});

		this._socket.on('error', error => {
			debug('Websocket error', error);
			this.disconnect();
			this.reconnect();
		});

		this._socket.on('message', message => {
			debug('RECEIVED', message);
			this._keepalive();
			let data, id, method, params, result;
			try {
				data = JSON.parse(message);
				id = data.id;
				if (data.id && this._sentRequests[data.id] === undefined) {
					debug("ID ERROR: Reply to unknown id received.");
				}
			} catch(error) {
				debug("MESSAGE ERROR:", error);
			}
			if(id && this._sentRequests[id]) {
				this._handleReply(data);
			} else {
				this._handleEvent(data);
			}
		});
	}

	reconnect() {
		if(RECONNECT_INTERVAL > 0) {
			console.log('Will keep trying...');
			this._reconnect_timeout_id = setTimeout(() => {this.connect()}, RECONNECT_INTERVAL);
		}
	}

	disconnect() {
		this._connected = false;
		this._socket.close(1000);
	}

	isConnected() {
		if(this._socket && this._socket.readyState == 1) {
			this._connected = true;
		} else {
			this._connected = false;
		}
		return this._connected;
	}

	ping() {
//		debug('_sentRequests.length', this._sentRequests);
		debug('Ping');
		this.sendCommand('JSONRPC.Ping', {});
	}

	sendCommand(method, params) {
		debug('sendCommand', method, params);
		this._keepalive();
		return new Promise((resolve, reject) => {
			if(!this._connected) {
				this.connect();
			}
			const options = { compress: false };
      const message = { jsonrpc: '2.0', method, params, id: (this._rpcId += 1) };
      this._socket.send(JSON.stringify(message), options, (error) => {
        if (error) {
					debug('ERROR1', error);
          //this.events.emit("error", { mac: this.mac, eventdata: error });
        }
        const timeout = setTimeout(() => {
					if(this._sentRequests[message.id]) {
						debug('No response within timeout');
	          delete this._sentRequests[message.id];
					}
        }, RPC_TIMEOUT);
				this._sentRequests[message.id] = { request: message, callback: function(id, result) {
					clearTimeout(timeout);
          resolve(result);
				}};
      });
    });
	}

	_handleReply(data) {
		debug('handleReply', data);
		let id = data.id;
		let result = data.result;


//		debug('REQ', this._sentRequests[id]);
		this._sentRequests[id].callback(id, result);
		delete this._sentRequests[id];
	}

	_handleEvent(payload) {
		debug('handleEvent', payload);
		if(payload) {

		} else {
			debug('ERROR: No data received');
		}
	}

	_keepalive() {
		if(KEEPALIVE_INTERVAL > 0) {
			clearInterval(this._keepalive_interval_id);
			if(this.isConnected()) {
				this._keepalive_interval_id = setInterval(() => {
					this.ping();
					this.getCurrentWindow();
				}, KEEPALIVE_INTERVAL);
			}
		}
	}

	getCurrentWindow() {
		this.sendCommand('GUI.GetProperties', {properties: ['currentwindow', 'currentcontrol']} );
	}

	_setCurrentWindow(window_id) {
		if(window_id != this._currentWindow) {
			this._previousWindow = this._currentWindow;
			this._currentWindow = window_id;
		}
	}

}

function getBroadcastAddress(target) {
	let nics = os.networkInterfaces();
	for(const [name, nic] of Object.entries(nics)) {
		for(const address of nic) {
			if(address.family == 'IPv4') {
				let block = new Netmask(address.cidr);
				if(block.contains(target)) {
					return block.broadcast;
				}
			}
		}
	}
}
