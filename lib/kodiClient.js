'use strict';

/*
 *	KodiClient: Handles API communication with a Kodi instance
 */

const debug = require('debug')('neeo-driver-kodi:KodiClient');
const debugData = debug.extend('data');
const conf = require('./Config');
const BluePromise = require('bluebird');
const os = require('os');
const wol = require('wake_on_lan');
var Netmask = require('netmask').Netmask;
const WebSocket = require('ws');
const KodiState = require('./KodiState');
//const EventEmitter = require("events");

const CONNECTION_TIMEOUT = 10000;
const RPC_TIMEOUT = 6000;
const RECONNECT_INTERVAL = 30000;
const KEEPALIVE_INTERVAL = 30000;

const WINDOW_IDS = {
	12005: 'Fullscreen video'
};

module.exports = class KodiClient {

	constructor(id, controller) {
		debug('CONSTRUCTOR', id);
		this.id = id;
		this.controller = controller;
		this.loadConfig();
		this.session;
		this.socket;
//		this.eventEmitter;
		this.rpcId = 0;
		this.connected = false;
		this.sentRequests = {};
		this.connection_timeout_id;
		this.reconnect_timeout_id;
		this.keepalive_interval_id;
		// Kodi state
		this.state = new KodiState(this.id, this);
		debug(this.toString());
//		this.eventEmitter	= new EventEmitter();
		this.ws_ctor_options = conf.get('ws_ctor_options');
		this.ws_send_options = conf.get('ws_send_options');
		this.connect();
	}

	loadConfig() {
		let service = conf.get('kodi_instances.' + this.id);
		for(let key in service) {
			this[key] = service[key];
		}
	}

	toString() {
    return 'KodiClient ' + this.id + ' ' + this.ws_uri;
  }

	_onOpen(event) {
		debug('Connected');
		clearTimeout(this.connection_timeout_id);
		this.connected = true;
		this._keepalive();
		this.state.update();
		let greeting = conf.get('kodi_greeting');
		if(greeting) {
			let message = {
				title: greeting.title || 'NEEO',
				message: greeting.message || 'NEEO is connected',
				image: conf.get('localhost.url') + '/image/' + (greeting.image || 'neeo-circle.jpg'),
				displaytime: greeting.displaytime || 5000
			};
			this.send('GUI.ShowNotification', message);
		}
	}

	_onClose(event) {
		debug('Connection closed by peer');
		this.connected = false;
		this.reconnect();
	}

	_onError(event) {
		debug('Websocket error', event);
		this.disconnect();
		this.reconnect();
	}

	_onMessage(event) {
		this._keepalive();
		let data, id, method, params, result;
		try {
			data = JSON.parse(event.data);
			id = data.id;
			if (data.id && this.sentRequests[data.id] === undefined) {
				debug('ID ERROR: Reply to unknown id received.');
			}
			if(id && this.sentRequests[id]) {
				this.handleReply(data);
			} else {
				this.handleNotification(data);
			}
		} catch(error) {
			switch(error.code) {
				case 'ECONNREFUSED':
					this.reachable = false;
					this.reconnect();
					break;
				default:
					debug('Fatal WS error', event.data);
					this.disconnect();
					this.reconnect();
					break;
			}
		}
	}

	connect() {
		debug('Connect()', this.ws_uri);
		if(this.socket && ( this.socket.readyState == WebSocket.CONNECTING || this.socket.readyState == WebSocket.OPEN )) {
			debug('Already connected');
			return true;
		}
		// Reachable state is maintained by lib/kodiDiscovery.js
		this.reachable = conf.get('kodi_instances.'+this.id+'.reachable');
		if(!this.reachable) {
			this.reconnect();
			return false;
		}

		try {
			if(this.socket) this.socket.terminate();
			this.socket = new WebSocket(this.ws_uri, this.ws_ctor_options);
			this.socket.addEventListener('open', (event) => {this._onOpen(event)});
			this.socket.addEventListener('close', (event) => {this._onClose(event)});
			this.socket.addEventListener('error', (event) => {this._onError(event)});
			this.socket.addEventListener('message', (event) => {this._onMessage(event)});
		} catch(error) {
			debug('Connection error:', error);
			this.reconnect();
			return false;
		}

		this.connection_timeout_id = setTimeout(() => {
			debug('Connection timed out');
			setTimeout(() => this.socket.terminate(), 8);
			this.reconnect();
		}, CONNECTION_TIMEOUT);

	}

	reconnect() {
		if(RECONNECT_INTERVAL > 0) {
			clearTimeout(this.reconnect_timeout_id);
			this.reconnect_timeout_id = setTimeout(() => {this.connect()}, RECONNECT_INTERVAL);
		}
	}

	disconnect(code_in, reason_in) {
		debug('disconnect()', this.socket.readyState);
		let code = code_in || 1000;
		let reason = reason_in || 'No reason given';
		this.connected = false;
		this.socket.close(code, reason);
	}

	isConnected() {
		if(this.socket && this.socket.readyState == WebSocket.OPEN) {
			this.connected = true;
		} else {
			this.connected = false;
		}
		return this.connected;
	}

	send(method, params) {
		var msg_id = this.rpcId += 1;
		debug('send', msg_id, method);
		this._keepalive();
		return new BluePromise((resolve, reject) => {
			if(!this.connected) {
				this.connect();
			}
			if(!this.socket) {
				return false;
			}
      const message = { jsonrpc: '2.0', method: method, params: params, id: msg_id };
      this.socket.send(JSON.stringify(message), this.ws_send_options, (error) => {
        if (error) {
					debug('SEND ERROR', error);
					reject(false);
          //this.events.emit("error", { mac: this.mac, eventdata: error });
        }
        const timeout = setTimeout(() => {
					if(this.sentRequests[message.id]) {
						debug('No response within timeout', message.id, this.sentRequests[message.id].request.method);
						if(this.sentRequests[message.id].request.method == 'JSONRPC.Ping') {
							this.disconnect();
							this.reconnect();
						}
	          delete this.sentRequests[message.id];
					}
        }, RPC_TIMEOUT);
				this.sentRequests[message.id] = { request: message, callback: function(id, result) {
					clearTimeout(timeout);
          resolve(result);
				}};
      });
    });
	}

  sendComponentUpdate(device_id, component_id, component_value) {
		debug('sendComponentUpdate()');
		return this.controller.sendComponentUpdate(device_id, component_id, component_value);
	}

	handleReply(data) {
		debug('handleReply()', data.id);
		debugData('handleReply DATA', data);
		let id = data.id;
		let result = data.result;
//		debug('REQ', this.sentRequests[id]);
		this.sentRequests[id].callback(id, result);
		delete this.sentRequests[id];
	}

	handleNotification(payload) {
		debug('handleNotification()', payload.method);
		debugData('handleNotification() DATA', payload);
		var seen = conf.get('seen.events') || {};
		if(payload) {
			if(payload.method && payload.params) {
				let method = payload.method;
				// FIXME
				seen[method] = method;
				conf.set('seen.events', seen);

				let params = payload.params;
				switch(method) {
					case 'Application.OnVolumeChanged':
						this.state.onVolumeChanged(params);
						break;
					case 'Player.OnPlay':
						this.state.onPlay(params);
						break;
					case 'Player.OnStop':
						this.state.onPlay(params);
						break;
					case 'Player.OnAVChange':
						this.state.onAVChange(params);
						break;
				}

			} else {
				debug('ERROR: What happen?');
				debug('PAYLO', payload);
			}
		} else {
			debug('ERROR: No data received');
		}
	}

	ping() {
		debug('Ping');
		console.log('KodiClient._sentRequests', this.sentRequests);
		this.send('JSONRPC.Ping', {});
	}

	wakeDevice() {
		debug('wakeDevice()', this.id, this.mac);
		this.loadConfig();
		if(this.reachable == false && this.address && this.mac) {
			let bc = getBroadcastAddress(this.address);
			debug('Broadcast address for', this.address, 'is', bc);
			let params = { num_packets: 3, interval: 100 };
			// Network broadcast (supposedly only working method on Windows)
			params.address = bc;
			params.port = 7;
			wol.wake(this.mac, params);
			params.port = 9;
			wol.wake(this.mac, params);
			// Global broadcast
			params.address = '255.255.255.255';
			params.port = 7;
			wol.wake(this.mac, params);
			params.port = 9;
			wol.wake(this.mac, params);
			// Unicast
			params.address = this.address;
			params.port = 7;
			wol.wake(this.mac, params);
			params.port = 9;
			wol.wake(this.mac, params);
		}
	}

	_keepalive() {
		if(KEEPALIVE_INTERVAL > 0) {
			clearInterval(this.keepalive_interval_id);
			if(this.isConnected()) {
				this.keepalive_interval_id = setInterval(() => {
					this.ping();
	//					this.state.update();
				}, KEEPALIVE_INTERVAL);
			}
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
