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
const md5 = require('../functions').md5;
const receptacle = require('../Receptacle').image_cache;
const axios = require('axios');
const fileType = require('file-type');
const conf = require('../Config');
const KodiState = require('../KodiState');
const Client_HTTP = require('./Client_HTTP');
const Client_WS = require('./Client_WS');


module.exports = class KodiClient {

	constructor(id, controller) {
		debug('CONSTRUCTOR', id);
		this.id = id;
		this.controller = controller;
		this.loadConfig();
		this.request_id = 0;
		this.connected = false;
		this.sent_requests = {};
		this.greeting = conf.get('kodi_greeting');
		this.greeting_sent = false;
		this.defaultThumbnail = conf.get('default_thumbnail');
		this.httpServiceUrl = conf.get('localhost.url');
		// Kodi state
		this.state = new KodiState(this.id, this);
		this.ws = new Client_WS(this);
		this.http = new Client_HTTP(this);
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

	connect() {
		if(this.http_reachable) {
			this.http.connect().then(() => {
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
				this.state.update();
			});
		}
		if(this.ws_reachable) {
			this.ws.connect();
		}
	}

	isConnected() {
		// FIXME
		this.connected = false;
		if(this.ws.isConnected() || this.ws.isConnected()) {
			this.connected = true;
		}
		return this.connected;
	}

	send(method, params) {
		debug('send', this.request_id, method);
			if(this.http.isConnected()) {
				return this.http.send(method, params);
			} else if(this.ws.isConnected()) {
				return this.ws.send(method, params);
			} else {
				return BluePromise.reject('No connection');
			}
	}

  sendComponentUpdate(device_id, component_id, component_value) {
		debug('sendComponentUpdate()');
		return this.controller.sendComponentUpdate(device_id, component_id, component_value);
	}

	handleNotification(method, params) {
		debug('handleNotification()', method);
		debugData('handleNotification() DATA', method, params);
		this.state.handleEvent(method, params);
	}

  /*
   *  Fetch and cache a Kodi-hosted image
   */
  async fetchKodiImage(internal_url, size_in) {
    debug('fetchKodiImage()');//, internal_url, size_in);
		let size = size_in || 480;
		let url_out = [this.httpServiceUrl, 'image', size, this.defaultThumbnail].join('/');
		try {
	    if(internal_url == undefined || internal_url == '') {
	        return url_out;
	    }
	    let external_url = this.kodiUrl(internal_url);
	    url_out = this.getLocalImageUrl(external_url, size);
			await this.fetchImage(external_url);
		} catch(error) {
			debug('ERROR', error.message);
		}
		return url_out;
  }

  /*
   *  Fetch any image via HTTP and store it in cache. Returns cache key
   */
  fetchImage(image_url) {
    debug('fetchImage()');//, image_url);
    return new BluePromise((resolve, reject) => {
      var hash = md5(image_url);
      if(receptacle.has(hash)) {
        resolve(hash);
      }
      axios.get(image_url, {responseType: 'arraybuffer'})
      .then(function (response) {
        if(response.status == 200) {
          var image = Buffer.from(response.data, 'binary');
          // Kodi doesn't send a content-type header
          const type = fileType(image);
          receptacle.set(hash, {type: type, data: image});
          resolve(hash);
        }
        reject(false);
      })
      .catch(function (error) {
        debug('ERROR', error);
        reject(error.message);
      });
    });
  }

  /*
   *  Build URL for Kodi web interface
   */
  kodiUrl(target_url) {
		debug('kodiUrl()');//, target_url);
    let url = 'http://';
    if(this.http_auth == true) {
      url += this.http_username + ':' + this.http_password + '@';
    }
    url += this.address + ':' + this.http_port + '/vfs/';
    url += encodeURIComponent(target_url);
//		debug('OUT', url);
    return url;
  }

	/*
	 *  Build URL for local cached image
	 */
	getLocalImageUrl(image_url, size_in) {
		debug('getLocalImageUrl()');//, image_url);
		let size = size_in || 480;
		let hash = md5(image_url);
		let url = [this.httpServiceUrl, 'image', size, hash].join('/') + '.jpg';
		return url;
	}

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
