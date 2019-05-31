'use strict';

const debug = require('debug')('neeo-driver-kodi:KodiClient:HTTP');
const axios = require('axios');
const dotProp = require('dot-prop');
const BluePromise = require('bluebird');
const conf = require('../Config');

module.exports = class Client_HTTP {

	constructor(client) {
		this.id = client.id;
		this.client = client;
		this.debug = debug.extend(client.name);
		this.debugData = this.debug.extend('data');
		this.debug('CONSTRUCTOR', client.id);

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
			maxContentLength: 524288
		};
		if(this.auth) {
			this.axios_options.auth = { username: this.username, password: this.password };
		}
		this.debug(this.toString());
	}

	toString() {
    return 'Client_HTTP ' + this.id + ' ' + this.uri;
  }


	connect() {
		this.debug('connect()');
		return new BluePromise((resolve, reject) => {
			this.socket = axios.create(this.axios_options);
			this.ping().then(() => {
				this._keepalive();
				resolve(true);
			});
		});
	}

	isConnected() {
		return this.connected;
	}

	send(method_in, params_in = {}, options_in = {}) {
		this.debug('send()', method_in);
		return new BluePromise((resolve, reject) => {
			let request_id = ++this.client.request_id;
			let data = { jsonrpc: '2.0', method: method_in, id: request_id, params: params_in };
			let options = Object.assign(this.axios_options, options_in);
			this.socket.post(this.uri, data, this.axios_options).then((response) => {
				if(response.data.result) {
					this.debugData('RESULT', response.data.result);
				} else {
					this.debugData('DATA', response.data);					
				}
				resolve(response.data.result);
			}).catch((error) => {
				this.debug('HTTP ERROR', error.message);
//				reject(error.message);
			});

		});

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
		this.debug('_keepalive()');
		clearInterval(this.keepalive_interval_id);
		if(this.keepalive_interval > 0) {
			if(this.isConnected()) {
				this.keepalive_interval_id = setInterval(() => { this.ping() }, this.keepalive_interval);
			}
		}
	}



}
