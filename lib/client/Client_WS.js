'use strict';

const debug = require('debug')('neeo-driver-kodi:KodiClient:WS');
const BluePromise = require('bluebird');
const WebSocket = require('ws');
const conf = require('../Config');

const WINDOW_IDS = {
	12005: 'Fullscreen video'
};

module.exports = class Client_WS {

	constructor(client) {
		this.id = client.id;
		this.client = client;
		this.debug = debug.extend(client.name);
		this.debugData = this.debug.extend('data');
		this.debug('CONSTRUCTOR', client.id);

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



//		this.connect();
		this.debug(this.toString());
	}

	toString() {
    return 'Client_WS ' + this.id + ' ' + this.ws_uri;
  }

	_onOpen(event) {
		this.debug('Connected');
//		this.client.onConnect(event);
		clearTimeout(this.connection_timeout_id);
		this.connected = true;
		this._keepalive();
	}

	_onClose(event) {
		this.debug('Connection closed by peer');
		this.connected = false;
		this.reconnect();
	}

	_onError(event) {
		if(event.message) {
			this.debug('Websocket error', event.message);
		} else {
			this.debug('Websocket error', event);
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
				this.debug('ID ERROR: Reply to unknown id received.');
			}
			if(id && this.sent_requests[id]) {
				this.handleReply(data);
			} else {
				this._onNotification(data);
			}
		} catch(error) {
			switch(error.code) {
				case 'ECONNREFUSED':
					this.reachable = false;
					this.reconnect();
					break;
				default:
					this.debug('Fatal WS error', event.data);
					this.debug(error);
					// this.disconnect();
					// this.reconnect();
					break;
			}
		}
	}

	_onNotification(data) {
		this.debug('handleNotification()', data.method);
		this.debugData('handleNotification() DATA', data);
		if(data) {
			if(data.method && data.params) {
				switch(data.method) {
					case 'AudioLibrary.OnUpdate':
					case 'VideoLibrary.OnUpdate':
						break;
					default:
						this.client.handleNotification(data.method, data.params);
				}
			} else {
				this.debug('ERROR: What happen?', data);
			}
		} else {
			this.debug('ERROR: No data received');
		}
	}

	connect() {
		this.debug('Connect()', this.ws_uri);
		return new BluePromise((resolve, reject) => {
			if(this.ws_socket && ( this.ws_socket.readyState == WebSocket.CONNECTING || this.ws_socket.readyState == WebSocket.OPEN )) {
				this.debug('Already connected');
				resolve(true);
			}
			// Reachable state is maintained by lib/kodiDiscovery.js
			this.reachable = conf.get('kodi_instances.'+this.id+'.reachable');
			if(!this.reachable) {
				this.reconnect();
				reject(false);
			}
			try {
				if(this.ws_socket) this.ws_socket.terminate();
				this.ws_socket = new WebSocket(this.ws_uri, this.ws_socket_options);
				this.ws_socket.addEventListener('open', (event) => {this._onOpen(event)});
				this.ws_socket.addEventListener('close', (event) => {this._onClose(event)});
				this.ws_socket.addEventListener('error', (event) => {this._onError(event)});
				this.ws_socket.addEventListener('message', (event) => {this._onMessage(event)});
			} catch(error) {
				this.debug('Connection error:', error);
				this.reconnect();
				reject(false);
			}
			this.connection_timeout_id = setTimeout(() => {
				this.debug('Connection timed out');
				setTimeout(() => this.ws_socket.terminate(), 8);
				this.reconnect();
			}, this.connection_timeout);
		});
	}

	reconnect() {
		if(this.reconnect_interval > 0) {
			clearTimeout(this.reconnect_timeout_id);
			this.reconnect_timeout_id = setTimeout(() => {this.connect()}, this.reconnect_interval);
		}
	}

	disconnect(code_in, reason_in) {
		this.debug('disconnect()', this.ws_socket.readyState);
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
		this.debug('send', request_id, method);
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
					this.debug('SEND ERROR', error);
					reject(false);
          //this.events.emit("error", { mac: this.mac, eventdata: error });
        }
        const timeout = setTimeout(() => {
					if(this.sent_requests[message.id]) {
						this.debug('No response within timeout', message.id, this.sent_requests[message.id].request.method);
						if(this.sent_requests[message.id].request.method == 'JSONRPC.Ping') {
							this.disconnect();
							this.reconnect();
						}
	          delete this.sent_requests[message.id];
					}
        }, this.request_timeout);
				this.sent_requests[message.id] = { request: message, callback: function(id, result) {
					clearTimeout(timeout);
          resolve(result);
				}};
      });
    });
	}

	handleReply(data) {
		this.debug('handleReply()', data.id);
		this.debugData('handleReply DATA', data);
		let id = data.id;
		let result = data.result;
		this.sent_requests[id].callback(id, result);
		delete this.sent_requests[id];
	}


	ping() {
		this.debug('Ping');
		return new BluePromise((resolve, reject) => {
			this.send('JSONRPC.Ping', {}).then((response) => {
				if(response == 'pong') {
					this.connected = true;
					resolve(true);
				} else {
					reject(response);
				}
			});
		});
	}

	_keepalive() {
		if(this.keepalive_interval > 0) {
			clearInterval(this.keepalive_interval_id);
			if(this.isConnected()) {
				// FIXME: Add a timer to check for last socket activity, so pings may be skipped.
				this.keepalive_interval_id = setInterval(() => { this.ping() }, this.keepalive_interval);
			}
		}
	}

}
