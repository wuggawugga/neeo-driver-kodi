'use strict';

/*
 *	kodiDiscovery: Discovery and availaility monitoring
 */

const debug = require('debug')('neeo-driver-kodi:kodiDiscovery');
const bonjour = require('bonjour')();
const WebSocket = require('ws');
const axios = require('axios');
const conf = require('./Configstore');

const MDNS_INTERVAL = 300000;		// Run mDNS discovery every 5 minutes. 0 = disable
const PING_INTERVAL = 60000;		// Ping discovered services every minute. 0 = disable
const MDNS_TIMEOUT = 3000;			// Wait up to 3 seconds for discovery

var mdns_browser_http;
var mdns_browser_ws;
var mdns_active = false;
var mdns_timeout_id;
var mdns_interval_id;
var ping_interval_id;
var probe_timeout_id;

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
		conf.set(config_key, service);
		debug('Registered HTTP API', service.http_uri);
		clearTimeout(mdns_timeout_id);
		mdns_timeout_id = setTimeout(endDiscovery, MDNS_TIMEOUT);
		clearTimeout(probe_timeout_id);
		probe_timeout_id = setTimeout(() => {probeDevice(service)}, 1000);
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
		service.reachable = true;
		conf.set(config_key, service);
		debug('Registered WS API', service.ws_uri);
		clearTimeout(mdns_timeout_id);
		mdns_timeout_id = setTimeout(endDiscovery, MDNS_TIMEOUT);
		clearTimeout(probe_timeout_id);
		probe_timeout_id = setTimeout(() => {probeDevice(service)}, 1000);
	});
}

function endDiscovery() {
	debug('Ending mDNS discovery');
	mdns_browser_http.stop();
	mdns_browser_ws.stop();
	mdns_active = false;
}

function probeDevice(service) {
	var id = service.id;
	var mac_probe_interval_id;
	debug('Probing device', service.host);
	// HTTP authentication
	if(service.http_uri) {
		var uri = '' + conf.get('kodi_instances.' + id + '.http_uri');
		var auth = false;
		var request_config = {
			url: uri,
			method: 'post',
			headers: {'Content-Type': 'application/json'},
			data: JSON.stringify({ jsonrpc: "2.0", method: "JSONRPC.Ping", id: 1 }),
			responseType: 'json',
		};
		// Caveat: If the API doesn't need authentication, any credentials will work
		// We'd need to run a separate test to invalidate credentials in that case
		if(service.username && service.password) {
			request_config.auth = { username: service.username, password: service.password };
			auth = true;
		}
		var instance = axios.create(request_config);
		instance.post(uri, request_config)
			.then(function (response) {
				if(response.status == 200) {
					debug('HTTP API connection success');
					conf.set('kodi_instances.' + id + '.auth', auth);
					conf.set('kodi_instances.' + id + '.registered', true);
				}
			})
			.catch(function (error) {
				if(error.response && error.response.status == 401) {
					debug('HTTP API connection error', uri);
					if(auth == true) {
						conf.delete('kodi_instances.' + id + '.username');
						conf.delete('kodi_instances.' + id + '.password');
					}
					conf.set('kodi_instances.' + id + '.auth', true);
					conf.set('kodi_instances.' + id + '.registered', false);
				}
			});
	}
	if(service.ws_uri) {
		// MAC address
		if(!service.mac) {
			const ws = new WebSocket(service.ws_uri);
			ws.on('open', function open() {
				mac_probe_interval_id = setInterval(() => {
					try {
						ws.send('{"jsonrpc":"2.0","method":"XBMC.GetInfoLabels","params":{"labels":["Network.MacAddress", "System.OSVersionInfo", "System.BuildVersion"]},"id": 305}');
					} catch(err) {
						debug('WTF?!', err);
					}
				}, 3000)
			});
			ws.on('error', function foo(error) {
				if(error.code == 'ECONNREFUSED') {
					console.log('WARNING: Kodi instance "' + service.name + '" has incorrect settings (Allow remote control from other systems)');
					conf.set('kodi_instances.' + service.id + '.remote_control', false);
					conf.set('kodi_instances.' + service.id + '.reachable', false);
				}
			});
			ws.on('message', function incoming(message) {
				try {
					let data = JSON.parse(message);
					let config_key = 'kodi_instances.'+service.id;
					if(data.id == 305 && data.result) {
						conf.set('kodi_instances.' + service.id + '.remote_control', true);
						let os = data.result['System.OSVersionInfo'];
						conf.set(config_key+'.os', os);
						let build = data.result['System.BuildVersion'];
						conf.set(config_key+'.build', build);
						let mac = data.result['Network.MacAddress'];
						if(mac.toLowerCase().match(/^([0-9a-f]{2}:?){6}$/)) {
							conf.set(config_key+'.mac', mac);
							clearInterval(mac_probe_interval_id);
							ws.close(1000);
							ws.terminate();
						}
					}
				} catch (error) {
					debug('Error', error);
					debug('Payload', message);
				}
			});
		}
	}

}

function pingServices() {
	let kodi_instances = conf.get('kodi_instances') || {};
	for (const [id, service] of Object.entries(kodi_instances)) {
		debug('Pinging', id);
		const ws = new WebSocket(service.ws_uri);
		ws.on('open', function open() {
  		debug('Service', id, 'is up');
			ws.close(1000);
			ws.terminate();
			conf.set('kodi_instances.' + id + '.reachable', true);
		});
		ws.on('error', function open() {
			debug('Service', id, 'is unreachable');
			conf.set('kodi_instances.' + id + '.reachable', false);
		});
  }
}
