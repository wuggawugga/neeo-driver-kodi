'use strict';

const debug = require('debug')('neeo-driver-kodi:KodiClient');
//const functions = require('../lib/functions');
const conf = require('./Configstore');
const WebSocket = require("ws");
//const EventEmitter = require("events");

const CONNECTION_TIMEOUT = 10000;
const RPC_TIMEOUT = 3000;
const RECONNECT_INTERVAL = 30000;
const KEEPALIVE_INTERVAL = 30000;

module.exports = class KodiClient {

	constructor(id) {
		debug('CONSTRUCTOR', id);
		let service = conf.get(id);
		this._id = id;
		this._name = service.name;
		this._address = service.address;
		this._port = service.port;
		this._reachable = service.reachable;
		this._ws_uri = service.ws_uri;
		this._session;
		this._socket;
		this._eventEmitter;
		this._rpcId = 0;
		this._connected = false;
		this._sentRequests = [];
		this._connection_timeout_id;
		this._reconnect_timeout_id;
		this._keepalive_interval_id;
		debug(this.toString());
//		this._eventEmitter	= new EventEmitter();
		this.connect();
	}

	toString() {
    return 'KodiClient ' + this._id + ' ' + this._ws_uri;
  }

	connect() {
		debug('Connect()', this._ws_uri);
		if(this._socket && ( this.socket.readyState == WebSocket.CONNECTING || this.socket.readyState == WebSocket.OPEN )) {
			debug('Already connected');
			return true;
		}
		// Reachable state is maintained by lib/kodiDiscovery.js
		this._reachable = conf.get(this._id+'.reachable');
		if(!this._reachable) {
			debug('Target unreachable');
			this.reconnect();
			return false;
		}

		this._socket = new WebSocket(this._ws_uri);

		this._connection_timeout_id = setTimeout(() => {
			debug('Connection timed out');
			setTimeout(() => this._socket.terminate(), 8);
			this.reconnect();
		}, CONNECTION_TIMEOUT);

		this._socket.on('open', () => {
			debug('Connected');
			clearTimeout(this._connection_timeout_id);
			this._connected = true;
			this.keepalive();
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
			this.keepalive();
			let data, id, method, params;
			try {
				data = JSON.parse(message);
				id = data.id;
				method = data.method;
				params = data.params;
				if (data.id && this._sentRequests[data.id] === undefined) {
					console.log("ID ERROR: Message for unknown id received.");
				}
			} catch (error) {
				console.log("MESSAGE ERROR:", error);
//				this.close();
			}
			if (id && this._sentRequests[id]) {
				this._sentRequests[id](data);
			} else {
//				handleKodiEvents(this, method, params);
			}
		});
	}

	reconnect() {
		if(RECONNECT_INTERVAL > 0) {
			debug('Will attempt reconnect');
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
		debug('Ping');
		this.sendCommand('JSONRPC.Ping', {});
	}

	keepalive() {
		if(KEEPALIVE_INTERVAL > 0) {
			clearInterval(this._keepalive_interval_id);
			if(this.isConnected()) {
				this._keepalive_interval_id = setInterval(() => {
					this.ping();
				}, KEEPALIVE_INTERVAL);
			}
		}
	}

	sendCommand(method, params) {
		debug('sendCommand');
		this.keepalive();
		return new Promise((resolve, reject) => {
			if(!this._connected) {
				this.connect();
			}
      const message = { jsonrpc: '2.0', method, params, id: (this._rpcId += 1) };
      this._socket.send(JSON.stringify(message), error => {
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
        this._sentRequests[message.id] = ({ id, error, result }) => {
          clearTimeout(timeout);
          delete this._sentRequests[id];
          if (error) {
						debug('ERROR2', error);
            //this.events.emit("error", { mac: this.mac, eventdata: error });
          }
          resolve(result);
        };
      });
			debug(this._sentRequests);
    });









	}


}

function noop() {}

/*

function coalesce(...args) {
	for (const [index, element] of args.entries()) {
		if(element !== null && element !== undefined) {
			return element;
		}
	}
}


*/
