'use strict';

/*
 *	kodiDiscovery: Discovery and availaility monitoring
 */

const debug = require('debug')('neeo-driver-kodi:kodiDiscovery');
const bonjour = require('bonjour')();
const WebSocket = require('ws');
const conf = require('./Configstore');

const MDNS_INTERVAL = 300000;		// Run mDNS discovery every 5 minutes. 0 = disable
const PING_INTERVAL = 60000;		// Ping discovered services every minute. 0 = disable
const MDNS_TIMEOUT = 3000;			// Wait up to 3 seconds for discovery

var mdns_browser;
var mdns_active = false;
var mdns_timeout_id;
var mdns_interval_id;
var ping_interval_id;

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
	mdns_browser = bonjour.find({ type: 'xbmc-jsonrpc' }, function (data) {
		debug('Kodi instance discovered:', data.name);
		let service_id = data.txt.uuid;
		let service = {};
		if(conf.has(service_id)) {
			service = conf.get(service_id);
		}
		service.id = service_id;
		service.name = data.name;
		service.host = data.host;
		service.address = data.addresses[0];
		service.port = data.port;
		service.fqdn = data.fqdn;
		service.uuid = data.txt.uuid;
		service.ws_uri = 'ws://'+service.address+':'+service.port+'/jsonrpc';
		service.reachable = true;
		conf.set(service_id, service);
		clearTimeout(mdns_timeout_id);
		probeDevice(service);
		mdns_timeout_id = setTimeout(endDiscovery, MDNS_TIMEOUT);
	});
}

function endDiscovery() {
	debug('Ending mDNS discovery');
	mdns_browser.stop();
	mdns_active = false;
}

function probeDevice(service) {
	var mac_probe_interval_id;
	debug('Probing device', service.host);
	// MAC address
	const ws = new WebSocket(service.ws_uri);
	ws.on('open', function open() {
		mac_probe_interval_id = setInterval(() => {
			ws.send('{"jsonrpc":"2.0","method":"XBMC.GetInfoLabels","params":{"labels":["Network.MacAddress", "System.OSVersionInfo", "System.BuildVersion"]},"id":1}')
		}, 3000)
	});
	ws.on('message', function incoming(message) {
//		debug(message);
		try {
			let data = JSON.parse(message);
			let mac = data.result['Network.MacAddress'];
			if (mac.toLowerCase().match(/^([0-9a-f]{2}:?){6}$/)) {
				conf.set(service.id+'.mac', mac);
				clearInterval(mac_probe_interval_id);
				ws.close(1000);
				ws.terminate();
			}
			let os = data.result['System.OSVersionInfo'];
			conf.set(service.id+'.os', os);
			let build = data.result['System.BuildVersion'];
			conf.set(service.id+'.build', build);
		} catch (error) {
			debug('Error', error);
		}
	});
}

function pingServices() {
	for (const [id, service] of Object.entries(conf.all)) {
		debug('Pinging', id);
		const ws = new WebSocket(service.ws_uri);
		ws.on('open', function open() {
  		debug('Service', id, 'is up');
			ws.close(1000);
			ws.terminate();
			conf.set(id+'.reachable', true);
		});
		ws.on('error', function open() {
			debug('Service', id, 'is unreachable');
			conf.set(id+'.reachable', false);
		});
  }
}
