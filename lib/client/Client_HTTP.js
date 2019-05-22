'use strict';

const debug = require('debug')('neeo-driver-kodi:KodiClient:HTTP');
const debugData = debug.extend('data');

const axios = require('axios');
const dotProp = require('dot-prop');
const BluePromise = require('bluebird');


const conf = require('../Config');


module.exports = class Client_HTTP {


	constructor(client) {
		debug('CONSTRUCTOR', client.id);
		this.id = client.id;
		this.client = client;


		let key = 'kodi_instances.' + this.id;
		this.uri = conf.get(key + '.http_uri');
		this.auth = conf.get(key + '.http_auth');
		this.username = conf.get(key + '.http_username');
		this.password = conf.get(key + '.http_password');
		this.registered = conf.get(key + '.http_registered');
		this.reachable = conf.get(key + '.http_reachable');

		this.connection_timeout = conf.get('api_connection_timeout');
		this.request_timeout = conf.get('api_request_timeout');
		this.reconnect_interval = conf.get('api_reconnect_interval');
		this.keepalive_interval = conf.get('api_keepalive_interval');

		this.keepalive_interval_id = null;

		this.connected = false;
		this.socket;

		this.axios_options = {
			baseURL: this.uri,
			method: 'post',
			headers: {'Content-Type': 'application/json'},
			responseType: 'json',
			timeout: this.request_timeout,
			maxContentLength: 65536
		};
		if(this.auth) {
			this.axios_options.auth = { username: this.username, password: this.password };
		}
		debug(this.axios_options);
		this.connect();
		debug(this.toString());
		this.ping();
	}

	toString() {
    return 'Client_HTTP ' + this.id + ' ' + this.http_uri;
  }


	connect() {
		debug('connect()');
		this.socket = axios.create(this.axios_options);
		this._keepalive();
	}

	isConnected() {
		return this.connected;
	}

	// {"jsonrpc":"2.0","id":1,"method":"Playlist.Add","params":{"playlistid":1,"item":{"file":"Media/Big_Buck_Bunny_1080p.mov"}}}
//		let data = JSON.stringify({ jsonrpc: "2.0", method: "JSONRPC.Ping", id: 1 }),


	send(method_in, params_in = {}, options_in = {}) {
		debug('send()', method_in);
		return new BluePromise((resolve, reject) => {
			//let data = { jsonrpc: "2.0", method: "JSONRPC.Ping", id: 1 };
//			let request_id = this.client.request_id += 1;
			let request_id = ++this.client.request_id;
			let data = { jsonrpc: '2.0', method: method_in, id: request_id, params: params_in };
			let options = Object.assign(this.axios_options, options_in);

			debug('URI', this.uri);
			debug('DAT', data);
			debug('OPT', this.axios_options);

			this.socket.post(this.uri, data, this.axios_options).then(function (response) {
				debugData('RESPONSE DATA', response);
				debug(response.data.result);
				resolve(response.data.result);
			}).catch(function (error) {
				debug('HTTP ERROR', error);
				reject(error.message);
			});

		});

	}

	ping() {
		debug('Ping');
		this.send('JSONRPC.Ping', {}).then((response) => {
			if(response == 'pong') {
				this.connected = true;
			}
		});
	}

	_keepalive() {
		debug('_keepalive()');
		if(this.keepalive_interval > 0) {
			clearInterval(this.keepalive_interval_id);
			if(this.isConnected()) {
				this.keepalive_interval_id = setInterval(() => { this.ping() }, this.keepalive_interval);
			}
		}
	}



}
