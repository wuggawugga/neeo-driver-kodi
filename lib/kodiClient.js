'use strict';

const debug = require('debug')('neeo-driver-kodi:KodiClient');
//const functions = require('../lib/functions');
const conf = require('./Configstore');
const WebSocket = require("ws");
//const EventEmitter = require("events");

const CONNECTION_TIMEOUT = 10000;
const RPC_TIMEOUT = 3000;
const RECONNECT_INTERVAL = 0;
const DEFAULT_USERNAME = 'kodi';
const DEFAULT_PASSWORD = 'kodi';

module.exports = class KodiClient {

	constructor(id) {
		debug('CONSTRUCTOR', id);
		this._id = id;
		this._name;
		this._address;
		this._port;
		this._username;
		this._password;
		this._session;
		this._socket;
		this._eventEmitter;
		this._rpcId = 0;
		this._connected = false;
		this._sentRequests = [];
//		this._eventEmitter	= new EventEmitter();
		this.load();
		debug(this.toString());
		this.connect();
	}

	load() {
		debug('load()');
		let service = conf.get(this._id);
		this._name = service.name;
		this._address = service.address;
		this._port = coalesce(service.port, 9090);
		this._username = coalesce(service.username, DEFAULT_USERNAME);
		this._password = coalesce(service.password, DEFAULT_PASSWORD);
//		debug(this);
	}

	toString() {
    return this._id + ' ' + this._address + ':' + this._port;
  }

	connect() {
		const uri = 'ws://'+this._address+':'+this._port+'/jsonrpc';
		debug('Connect()', uri);

		this._socket = new WebSocket(uri);

		var connection_timeout_id = setTimeout(() => {
			console.log('Connection timed out');
			setTimeout(() => this._socket.terminate(), 1);
		}, CONNECTION_TIMEOUT);

		this._socket.on('open', () => {
			debug('CONNECTED');
			this._connected = true;
			clearTimeout(connection_timeout_id);
//			this.events.emit('connected', { mac: this.mac, eventdata: "Was not able to connect before reaching timeout." });
		});

		this._socket.on('close', () => {
			this._connected = false;
//			this.events.emit("closed", { mac: this.mac, eventdata: "Connection closed." });
			if(RECONNECT_INTERVAL > 0) {
				setTimeout(() => {this.connect()}, RECONNECT_INTERVAL);
			}
		});

		this._socket.on('error', error => {
			console.log("SOCKET ERROR:", error);
			this.disconnect();
		});

		this._socket.on('message', message => {
			debug('RECEIVED', message);
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

	disconnect() {
		this._connected = false;
		this._socket.close();
	}

	isConnected() {
		return this._connected;
	}

	ping() {
		this.sendCommand('JSONRPC.Ping', {});
	}

	sendCommand(method, params) {
		debug('sendCommand');
		return new Promise((resolve, reject) => {
			if(!this._connected) {
				this.connect();
			}
      const message = { jsonrpc: "2.0", method, params, id: (this._rpcId += 1) };
      this._socket.send(JSON.stringify(message), error => {
        if (error) {
          //this.events.emit("error", { mac: this.mac, eventdata: error });
        }
        const timeout = setTimeout(() => {
					if(this._sentRequests[message.id]) {
						console.log("No response within timeout.");
	          delete this._sentRequests[message.id];
					}
        }, RPC_TIMEOUT);
        this._sentRequests[message.id] = ({ id, error, result }) => {
          clearTimeout(timeout);
          delete this._sentRequests[id];
          if (error) {
            //this.events.emit("error", { mac: this.mac, eventdata: error });
          }
          resolve(result);
        };
      });
    });









	}


}


function coalesce(...args) {
	for (const [index, element] of args.entries()) {
		if(element !== null && element !== undefined) {
			return element;
		}
	}
}
