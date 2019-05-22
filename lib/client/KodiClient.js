'use strict';

/*
 *	KodiClient: Handles API communication with a Kodi instance
 */

const debug = require('debug')('neeo-driver-kodi:KodiClient');
const debugData = debug.extend('data');
const BluePromise = require('bluebird');
const os = require('os');
const wol = require('wake_on_lan');
var Netmask = require('netmask').Netmask;
const WebSocket = require('ws');
const conf = require('../Config');
const KodiState = require('../KodiState');
const Client_HTTP = require('./Client_HTTP');
const Client_WS = require('./Client_WS');

//const EventEmitter = require("events");

// const CONNECTION_TIMEOUT = 10000;
// const RPC_TIMEOUT = 10000;
// const RECONNECT_INTERVAL = 30000;
// const KEEPALIVE_INTERVAL = 30000;

const WINDOW_IDS = {
	12005: 'Fullscreen video'
};

module.exports = class KodiClient {

	constructor(id, controller) {
		debug('CONSTRUCTOR', id);
		this.id = id;
		this.controller = controller;
		this.request_id = 0;
		// Kodi state
		this.state = new KodiState(this.id, this);
		this.ws = new Client_WS(this);
		this.http = new Client_HTTP(this);
		// this.ws_socket;
		// this.ws_socket_options = conf.get('ws_socket_options');
		// this.ws_send_options = conf.get('ws_send_options');
		this.connected = false;
		this.sent_requests = {};
		// this.connection_timeout_id;
		// this.reconnect_timeout_id;
		// this.keepalive_interval_id;
		this.greeting = conf.get('kodi_greeting');
		this.greeting_sent = false;
		// this.session;
		// this.eventEmitter;
		// this.eventEmitter	= new EventEmitter();
		this.loadConfig();
//		this.connect();
//		debug(this.toString());
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

	// _onOpen(event) {
	onConnect(event) {
		debug('onConnect()');
		// clearTimeout(this.connection_timeout_id);
		// this.connected = true;
		// this._keepalive();
		// this.state.update();
		if(this.greeting && this.greeting_sent == false) {
			let message = {
				title: this.greeting.title || 'NEEO',
				message: this.greeting.message || 'NEEO is connected',
				image: conf.get('localhost.url') + '/image/' + (this.greeting.image || 'neeo-circle.jpg'),
				displaytime: this.greeting.displaytime || 5000
			};
			this.send('GUI.ShowNotification', message);
			this.greeting_sent = true;
		}
	}
/*
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
			if (data.id && this.sent_requests[data.id] === undefined) {
				debug('ID ERROR: Reply to unknown id received.');
			}
			if(id && this.sent_requests[id]) {
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
*/
	connect() {
		debug('Connect()');
		this.http.connect();
		this.ws.connect();
		/*
		if(this.ws_socket && ( this.ws_socket.readyState == WebSocket.CONNECTING || this.ws_socket.readyState == WebSocket.OPEN )) {
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
			if(this.ws_socket) this.ws_socket.terminate();
			this.ws_socket = new WebSocket(this.ws_uri, this.ws_socket_options);
			this.ws_socket.addEventListener('open', (event) => {this._onOpen(event)});
			this.ws_socket.addEventListener('close', (event) => {this._onClose(event)});
			this.ws_socket.addEventListener('error', (event) => {this._onError(event)});
			this.ws_socket.addEventListener('message', (event) => {this._onMessage(event)});
		} catch(error) {
			debug('Connection error:', error);
			this.reconnect();
			return false;
		}

		this.connection_timeout_id = setTimeout(() => {
			debug('Connection timed out');
			setTimeout(() => this.ws_socket.terminate(), 8);
			this.reconnect();
		}, CONNECTION_TIMEOUT);
	*/
	}
	/*

	reconnect() {
		if(RECONNECT_INTERVAL > 0) {
			clearTimeout(this.reconnect_timeout_id);
			this.reconnect_timeout_id = setTimeout(() => {this.connect()}, RECONNECT_INTERVAL);
		}
	}
	disconnect(code_in, reason_in) {
		debug('disconnect()', this.ws_socket.readyState);
		let code = code_in || 1000;
		let reason = reason_in || 'No reason given';
		this.connected = false;
		this.ws_socket.close(code, reason);
	}
*/
	isConnected() {
		// FIXME
		this.connected = false;
		if(this.ws.isConnected() || this.ws.isConnected()) {
			this.connected = true;
		}
		return this.connected;
	}

	send(method, params) {
		// var msg_id = this.request_id += 1;
		debug('send', this.request_id, method);
//		return new BluePromise((resolve, reject) => {
			if(this.http.isConnected()) {
				debug('HTTP');
				return this.http.send(method, params);
			} else if(this.ws.isConnected()) {
				debug('WS');
				return this.ws.send(method, params);
			} else {
				debug('Reject');
				return BluePromise.reject('No connection');
			}
//		});
/*
		this._keepalive();
		return new BluePromise((resolve, reject) => {
			if(!this.connected) {
				this.connect();
			}
			if(!this.ws_socket) {
				return false;
			}
      const message = { jsonrpc: '2.0', method: method, params: params, id: msg_id };
      this.ws_socket.send(JSON.stringify(message), this.ws_send_options, (error) => {
        if (error) {
					debug('SEND ERROR', error);
					reject(false);
          //this.events.emit("error", { mac: this.mac, eventdata: error });
        }
        const timeout = setTimeout(() => {
					if(this.sent_requests[message.id]) {
						debug('No response within timeout', message.id, this.sent_requests[message.id].request.method);
						if(this.sent_requests[message.id].request.method == 'JSONRPC.Ping') {
							this.disconnect();
							this.reconnect();
						}
	          delete this.sent_requests[message.id];
					}
        }, RPC_TIMEOUT);
				this.sent_requests[message.id] = { request: message, callback: function(id, result) {
					clearTimeout(timeout);
          resolve(result);
				}};
      });
    });
		*/
	}

  sendComponentUpdate(device_id, component_id, component_value) {
		debug('sendComponentUpdate()');
		return this.controller.sendComponentUpdate(device_id, component_id, component_value);
	}

/*
	handleReply(data) {
		debug('handleReply()', data.id);
		debugData('handleReply DATA', data);
		let id = data.id;
		let result = data.result;
//		debug('REQ', this.sent_requests[id]);
		this.sent_requests[id].callback(id, result);
		delete this.sent_requests[id];
	}
*/

	handleNotification(method, params) {
		debug('handleNotification()', method);
		debugData('handleNotification() DATA', method, params);
		this.state.handleEvent(method, params);
	}

/*
	ping() {
		debug('Ping');
		this.send('JSONRPC.Ping', {});
	}
*/

	wakeDevice() {
		debug('wakeDevice()', this.id, this.mac);
		this.loadConfig();
		if(this.reachable == false && this.address && this.mac) {
			let bc = this.getBroadcastAddress(this.address);
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
/*
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
*/

	getBroadcastAddress(target) {
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
}
