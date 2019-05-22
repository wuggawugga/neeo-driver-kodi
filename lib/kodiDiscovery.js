'use strict';

/*
 *	kodiDiscovery: Discovery and availaility monitoring
 */

const debug = require('debug')('neeo-driver-kodi:kodiDiscovery');
const axios = require('axios');
const BluePromise = require('bluebird');
const bonjour = require('bonjour')();
const dotProp = require('dot-prop');
const WebSocket = require('ws');
const conf = require('./Config');

const MDNS_INTERVAL = 300000;		// Run mDNS discovery every 5 minutes. 0 = disable
const PING_INTERVAL = 60000;		// Ping discovered services every minute. 0 = disable
const MDNS_TIMEOUT = 3000;			// Wait up to 3 seconds for discovery

const WS_HANDSHAKE_TIMEOUT = 5000;	// I Don't know if there is a difference
const WS_HTTP_TIMEOUT = 4000;

var mdns_browser_http;
var mdns_browser_ws;
var mdns_active = false;
var mdns_timeout_id;
var mdns_interval_id;
var ping_interval_id;
var probe_timeout_id;
const ws_options = { handshakeTimeout: WS_HANDSHAKE_TIMEOUT, timeout: WS_HTTP_TIMEOUT };

beginDiscovery();
pingServices();

if(MDNS_INTERVAL > 0 && !mdns_interval_id) {
	mdns_interval_id = setInterval(beginDiscovery, MDNS_INTERVAL);
}
if(PING_INTERVAL > 0 && !ping_interval_id) {
	mdns_interval_id = setInterval(pingServices, PING_INTERVAL);
}

function beginDiscovery() {
	if(mdns_active) {
		return;
	}
	debug('Beginning mDNS discovery');
	mdns_active = true;
	// HTTP API
	mdns_browser_http = bonjour.find({ type: 'xbmc-jsonrpc-h' }, function (data) {
		debug('Kodi HTTP API discovered:', data.name);
		if(!data.addresses[0] || !data.port) {
			return;
		}
		let service_id = data.txt.uuid;
		let config_key = 'kodi_instances.'+service_id;
		let service = conf.get(config_key) || {};
		service.http_port = data.port;
		service.http_uri = 'http://'+data.addresses[0]+':'+data.port+'/jsonrpc';
		service.http_reachable = true;
		conf.set(config_key, service);
		debug('\tHTTP API registered', service.http_uri);
		clearTimeout(mdns_timeout_id);
		mdns_timeout_id = setTimeout(endDiscovery, MDNS_TIMEOUT);
		clearTimeout(probe_timeout_id);
		probe_timeout_id = setTimeout(() => {probeDevice(service_id)}, 1000);
	});
	// WS API
	mdns_browser_ws = bonjour.find({ type: 'xbmc-jsonrpc' }, function (data) {
		debug('Kodi WS API discovered:', data.name);
		if(!data.addresses[0] || !data.port) {
			return;
		}
		let service_id = data.txt.uuid;
		let config_key = 'kodi_instances.'+service_id;
		let service = conf.get(config_key) || {};
		service.id = service_id;
		service.name = data.name;
		service.host = data.host;
		service.address = data.addresses[0];
		service.fqdn = data.fqdn;
		service.uuid = data.txt.uuid;
		service.ws_port = data.port;
		service.ws_uri = 'ws://'+service.address+':'+data.port+'/jsonrpc';
		service.ws_reachable = true;
		conf.set(config_key, service);
		debug('\tWS API registered:', service.ws_uri);
		clearTimeout(mdns_timeout_id);
		mdns_timeout_id = setTimeout(endDiscovery, MDNS_TIMEOUT);
		clearTimeout(probe_timeout_id);
		probe_timeout_id = setTimeout(() => {probeDevice(service_id)}, 1000);
	});
}

function endDiscovery() {
	debug('Ending mDNS discovery');
	mdns_browser_http.stop();
	mdns_browser_ws.stop();
	mdns_active = false;
}

function probeDevice(id) {
	var key = 'kodi_instances.' + id;
	var kodi = conf.get(key);
	var mac_probe_interval_id;
	debug('Probing device', kodi.name);
	// HTTP authentication
	if(kodi.http_uri) {
		authRequired(id).then((required) => {
			debug('\tHTTP API authentication required');
			conf.set(key + '.http_auth', true);
			// Probe any stored credentials
			if(kodi.http_username && kodi.http_password) {
				testAuth(id, kodi.http_username, kodi.http_password).then((success) => {
					debug('\tHTTP API credentials valid');
					conf.set(key + '.http_registered', true);
					conf.set(key + '.http_reachable', true);
				}).catch((failure) => {
					debug('\tHTTP API credentials invalid');
					conf.set(key + '.http_registered', false);
					conf.delete(key + '.http_username');
					conf.delete(key + '.http_password');
				});
			} else {
				// Next time around, try kodi/kodi just in case
				testAuth(id, 'kodi', 'kodi').then((success) => {
					debug('\tHTTP API default credentials valid');
					conf.set(key + '.http_username', 'kodi');
					conf.set(key + '.http_password', 'kodi');
					conf.set(key + '.http_registered', true);
					conf.set(key + '.http_reachable', true);
				});
			}
		}).catch(() => {
			// No auth required
			debug('\tHTTP API authentication disabled');
			conf.set(key + '.http_auth', true);
			conf.set(key + '.http_registered', true);
			conf.set(key + '.http_reachable', true);
		});
	}
	if(kodi.ws_uri) {
		// MAC address
		if(!kodi.mac) {
			const ws = new WebSocket(kodi.ws_uri, ws_options);
			ws.on('open', function open() {
				mac_probe_interval_id = setInterval(() => {
					try {
						debug('\tWS API connected');
						ws.send('{"jsonrpc":"2.0","method":"XBMC.GetInfoLabels","params":{"labels":["Network.MacAddress", "System.OSVersionInfo", "System.BuildVersion"]},"id": 305}');
					} catch(err) {
						debug('WTF?!', err);
					}
				}, 3000)
			});
			ws.on('error', function foo(error) {
				debug('ERROR');
				if(error.code == 'ECONNREFUSED') {
					console.log('WARNING: Kodi instance "' + kodi.name + '" has incorrect settings (Allow remote control from other systems)');
					conf.set(key + '.remote_control', false);
					conf.set(key + '.ws_reachable', false);
				}
			});
			ws.on('message', function incoming(message) {
				try {
					let data = JSON.parse(message);
					if(data.id == 305 && data.result) {
						conf.set(key + '.remote_control', true);
						let os = data.result['System.OSVersionInfo'];
						conf.set(key+'.os', os);
						let build = data.result['System.BuildVersion'];
						conf.set(key+'.build', build);
						let mac = data.result['Network.MacAddress'];
						if(mac.toLowerCase().match(/^([0-9a-f]{2}:?){6}$/)) {
							conf.set(key+'.mac', mac);
							clearInterval(mac_probe_interval_id);
							ws.close(1000);
							ws.terminate();
						}
					}
				} catch (error) {
					debug('Error', error);
					debug('Payload', message);
					return false;
				}
				conf.set(key + '.ws_reachable', true);
			});
		}
	}
}

function authRequired(id) {
	return new BluePromise((resolve, reject) => {
		let kodi = conf.get('kodi_instances.' + id);
		let uri = kodi.http_uri;
		let request_config = {
			url: uri,
			method: 'post',
			headers: {'Content-Type': 'application/json'},
			data: JSON.stringify({ jsonrpc: "2.0", method: "JSONRPC.Ping", id: 1 }),
			responseType: 'json',
		};
		axios.post(uri, request_config).then(function (response) {
			if(response.status == 200) {
				reject('No authentication required');
			}
		})
		.catch(function (error) {
			if(dotProp.get(error, 'response.status') == 401) {
				resolve(true);
			}
		});
	});
}

function testAuth(id, username, password) {
	return new BluePromise((resolve, reject) => {
		let kodi = conf.get('kodi_instances.' + id);
		let uri = kodi.http_uri;
		let request_config = {
			url: uri,
			method: 'post',
			headers: {'Content-Type': 'application/json'},
			data: JSON.stringify({ jsonrpc: "2.0", method: "JSONRPC.Ping", id: 1 }),
			responseType: 'json',
			http_auth: { username: username, password: password },
			auth: true
		};
		axios.post(uri, request_config).then(function (response) {
			if(response.status == 200) {
				resolve(true);
			}
		}).catch(function (error) {
			if(dotProp.get(error, 'response.status') == 401) {
				resolve('Access denied');
			}
		});
	});
}

function pingServices() {
	let kodi_instances = conf.get('kodi_instances') || {};
	for (const [id, kodi] of Object.entries(kodi_instances)) {
		debug('Pinging', kodi.name);
		const ws = new WebSocket(kodi.ws_uri, ws_options);
		ws.on('open', function open() {
  		debug('\t' + kodi.name, 'is up');
			ws.close(1000);
			ws.terminate();
			conf.set('kodi_instances.' + id + '.ws_reachable', true);
		});
		ws.on('error', function open() {
			debug('Service', id, 'is unreachable');
			conf.set('kodi_instances.' + id + '.ws_reachable', false);
		});
		let http_reachable = conf.get('kodi_instances.' + id + '.http_reachable');
		let ws_reachable = conf.get('kodi_instances.' + id + '.ws_reachable');
		let reachable = http_reachable & ws_reachable;
		conf.set('kodi_instances.' + id + '.reachable', reachable);
  }
}
