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

// List of thumbnail URIs to replace with our own default
const thumbnail_override = [
	'image://DefaultAlbumCover.png/'
];

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
		this.httpServiceUrl = conf.get('localhost.url');
		this.defaultThumbnail = conf.get('thumbnail_default_image');
		this.image_cache_enabled = conf.get('image_cache_enabled');
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
		try {
			if(this.http.isConnected()) {
				return this.http.send(method, params);
			} else if(this.ws.isConnected()) {
				return this.ws.send(method, params);
			} else {
//				return BluePromise.reject('No connection');
				debug('No connection');
				return BluePromise.resolve(false);
			}
		} catch(error) {
			debug('ERROR', error.message);
			return BluePromise.resolve(false);
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
  getKodiImage(internal_url, size_in) {
    debug('getKodiImage()');
		let size = size_in || 480;
		let url_out = [this.httpServiceUrl, 'image', size, this.defaultThumbnail].join('/');
		try {
			if(thumbnail_override.includes(internal_url)) {
				return url_out;
			}
			if(this.image_cache_enabled) {
				if(internal_url && internal_url != '') {
					let external_url = this.kodiUrl(internal_url);
					this.fetchImage(external_url);
					let url_out = this.getLocalImageUrl(external_url, size);
					return url_out;
				}
			} else {
				return this.kodiUrl(internal_url);
			}
		} catch(error) {
			debug('ERROR', error.message);
		}
//		return this.defaultThumbnailUrl;
		return url_out;
  }

	// Just a hash. Change the string to unvalidate NEEO cache
	getHash(image_url) {
		return md5(image_url+'3');
	}

  /*
   *  Fetch any image via HTTP and store it in cache. Returns cache key
   */
  fetchImage(image_url) {
    debug('fetchImage()');//, image_url);
    return new BluePromise((resolve, reject) => {
      var hash = this.getHash(image_url);
      if(receptacle.has(hash)) {
        resolve(hash);
      } else {
				var p = axios.get(image_url, {responseType: 'arraybuffer'})
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
				receptacle.set(hash, {type: 'placeholder', data: p});
			}
    });
  }

  /*
   *  Build URL for Kodi web interface
   */
  kodiUrl(target_url) {
		debug('kodiUrl()', target_url);
		let url = null;
		if(target_url.startsWith('image://')) {
			url = 'http://';
			if(this.http_auth == true) {
				url += this.http_username + ':' + this.http_password + '@';
			}
			url += this.address + ':' + this.http_port + '/vfs/';
			url += encodeURIComponent(target_url);
		} else if(target_url.startsWith('http')) {
			return target_url;
		}  else {
			url = this.kodiUrl('image://' + encodeURIComponent(target_url));
		}
    return url;
  }

	/*
	 *  Build URL for local cached image
	 */
	getLocalImageUrl(image_url, size_in) {
		debug('getLocalImageUrl()');//, image_url);
		let size = size_in || 480;
		let hash = this.getHash(image_url);
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
