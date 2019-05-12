'use strict';

/*
 *	KodiClient: Handles API communication with a Kodi instance
 */

const debug = require('debug')('neeo-driver-kodi:KodiClient');
const debugData = debug.extend('data');
const conf = require('./Configstore');
const BluePromise = require('bluebird');
const os = require('os');
const wol = require('wake_on_lan');
var Netmask = require('netmask').Netmask;
const WebSocket = require('ws');
const KodiState = require('./KodiState');
//const EventEmitter = require("events");
// const receptacle = require('./Receptacle');

const CONNECTION_TIMEOUT = 10000;
const RPC_TIMEOUT = 3000;
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

	// testhest() {
	// 	debug('testhest');
	// 	debug('BIG GETS', receptacle.has('d95faab4f62bf11ec1451e22534cd807'));
	// 	var buf = receptacle.get('d95faab4f62bf11ec1451e22534cd807');
	// 	debug('isBuffer', buf)
	// }


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
			this.socket = new WebSocket(this.ws_uri);
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

		this.socket.on('open', () => {
			debug('Connected');
			clearTimeout(this.connection_timeout_id);
			this.connected = true;
			this.keepalive();
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
		});

		this.socket.on('close', () => {
			debug('Connection closed by peer');
			this.connected = false;
			this.reconnect();
		});

		this.socket.on('error', error => {
			debug('Websocket error', error);
			this.connected = false;
			this.disconnect();
			this.reconnect();
		});

		this.socket.on('message', message => {
			this.keepalive();
			let data, id, method, params, result;
			try {
				data = JSON.parse(message);
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
						debug('WebSocket ERROR:', error);
						debug('MESSAGE:', message);
						break;
				}
			}
		});
	}

	reconnect() {
		if(RECONNECT_INTERVAL > 0) {
			this.reconnect_timeout_id = setTimeout(() => {this.connect()}, RECONNECT_INTERVAL);
		}
	}

	disconnect() {
		this.connected = false;
		this.socket.close(1000);
	}

	isConnected() {
		if(this.socket && this.socket.readyState == 1) {
			this.connected = true;
		} else {
			this.connected = false;
		}
		return this.connected;
	}

	send(method, params) {
		var msg_id = this.rpcId += 1;
		debug('send', msg_id, method);
		this.keepalive();
		return new BluePromise((resolve, reject) => {
			if(!this.connected) {
				this.connect();
			}
			if(!this.socket) {
				return false;
			}
			const options = { compress: false };
      const message = { jsonrpc: '2.0', method: method, params: params, id: msg_id };
      this.socket.send(JSON.stringify(message), options, (error) => {
        if (error) {
					debug('ERROR1', error);
          //this.events.emit("error", { mac: this.mac, eventdata: error });
        }
        const timeout = setTimeout(() => {
					if(this.sentRequests[message.id]) {
						debug('No response within timeout');
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
			}
		} else {
			debug('ERROR: No data received');
		}
	}

	// neeo-driver-kodi:KodiClient RECEIVED {"jsonrpc":"2.0","method":"Player.OnStop","params":{"data":{"end":false,"item":{"title":"Game of Thrones - S08E03 - The Long Night.mkv","type":"movie"}},"sender":"xbmc"}} +53ms
  // neeo-driver-kodi:KodiClient handleEvent { jsonrpc: '2.0',
  // method: 'Player.OnStop',
  // params: { data: { end: false, item: [Object] }, sender: 'xbmc' } } +5ms



	keepalive() {
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
