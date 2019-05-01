'use strict';

const debug = require('debug')('neeo-driver-kodi:KodiBrowser');
//const conf = require('./Configstore');

module.exports = class KodiBrowser {

	constructor(id, client) {
		debug('CONSTRUCTOR', id);
		this._client = client;
/*
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
		this.currentWindow;
		debug(this.toString());
		this.connect();
*/
	}

	toString() {
    return 'KodiBrowser ' + this._id;
  }

	browse(directory, params) {

	}

	listAction(directory, params) {

	}

}
