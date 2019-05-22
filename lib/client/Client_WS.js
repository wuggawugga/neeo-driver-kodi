'use strict';

const debug = require('debug')('neeo-driver-kodi:KodiClient:WS');
const debugData = debug.extend('data');
const BluePromise = require('bluebird');
const WebSocket = require('ws');
const conf = require('../Config');

const CONNECTION_TIMEOUT = 10000;
const RPC_TIMEOUT = 10000;
const RECONNECT_INTERVAL = 30000;

const WINDOW_IDS = {
	12005: 'Fullscreen video'
};

module.exports = class Client_WS {

	constructor(client) {
		debug('CONSTRUCTOR', client.id);
		this.id = client.id;
		this.client = client;

		this.ws_socket;
		this.ws_socket_options = conf.get('ws_socket_options');
		this.ws_send_options = conf.get('ws_send_options');
		this.ws_uri = conf.get('kodi_instances.' + this.id + '.ws_uri');
//		this.request_id = 0;
		this.connected = false;
		this.sent_requests = {};
		this.connection_timeout_id;
		this.reconnect_timeout_id;
		this.keepalive_interval_id;
		// this.session;
		// this.eventEmitter;
		// this.eventEmitter	= new EventEmitter();

		this.connection_timeout = conf.get('api_connection_timeout');
		this.request_timeout = conf.get('api_request_timeout');
		this.reconnect_interval = conf.get('api_reconnect_interval');
		this.keepalive_interval = conf.get('api_keepalive_interval');



		this.connect();
		debug(this.toString());
	}

	toString() {
    return 'Client_WS ' + this.id + ' ' + this.ws_uri;
  }

	_onOpen(event) {
		debug('Connected');
		this.client.onConnect(event);
		clearTimeout(this.connection_timeout_id);
		this.connected = true;
		this._keepalive();
	}

	_onClose(event) {
		debug('Connection closed by peer');
		this.connected = false;
		this.reconnect();
	}

	_onError(event) {
		if(event.message) {
			debug('Websocket error', event.message);
		} else {
			debug('Websocket error', event);
		}
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

	connect() {
		debug('Connect()', this.ws_uri);
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

	}

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

	isConnected() {
		if(this.ws_socket && this.ws_socket.readyState == WebSocket.OPEN) {
			this.connected = true;
		} else {
			this.connected = false;
		}
		return this.connected;
	}

	send(method, params) {
		var request_id = this.client.request_id += 1;
		debug('send', request_id, method);
		this._keepalive();
		return new BluePromise((resolve, reject) => {
			if(!this.connected) {
				this.connect();
			}
			if(!this.ws_socket) {
				return false;
			}
      const message = { jsonrpc: '2.0', method: method, params: params, id: request_id };
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
	}

  // sendComponentUpdate(device_id, component_id, component_value) {
	// 	debug('sendComponentUpdate()');
	// 	return this.controller.sendComponentUpdate(device_id, component_id, component_value);
	// }

	handleReply(data) {
		debug('handleReply()', data.id);
		debugData('handleReply DATA', data);
		let id = data.id;
		let result = data.result;
//		debug('REQ', this.sent_requests[id]);
		this.sent_requests[id].callback(id, result);
		delete this.sent_requests[id];
	}

	handleNotification(data) {
		debug('handleNotification()', data.method);
		debugData('handleNotification() DATA', data);
		if(data) {
			if(data.method && data.params) {
				this.client.handleNotification(method, params);
			} else {
				debug('ERROR: What happen?', data);
			}
		} else {
			debug('ERROR: No data received');
		}
	}

	ping() {
		debug('Ping');
		this.send('JSONRPC.Ping', {}).then((response) => {
			debug('PONG', response);
//			process.exit(0);
		});;
	}

	_keepalive() {
		if(this.keepalive_interval > 0) {
			clearInterval(this.keepalive_interval_id);
			if(this.isConnected()) {
				this.keepalive_interval_id = setInterval(() => { this.ping() }, this.keepalive_interval);
			}
		}
	}

}
