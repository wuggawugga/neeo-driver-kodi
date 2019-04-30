'use strict';

/*
 *	kodiDiscovery: Discovery and availaility monitoring
 */

const debug = require('debug')('neeo-driver-kodi:kodiDiscovery');
const bonjour = require('bonjour')();
const WebSocket = require("ws");
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
		mdns_timeout_id = setTimeout(endDiscovery, MDNS_TIMEOUT);
	});
}

function endDiscovery() {
	debug('Ending mDNS discovery');
	mdns_browser.stop();
	mdns_active = false;
}

function pingServices() {
	for (const [id, service] of Object.entries(conf.all)) {
		debug('Pinging', id);
		const ws = new WebSocket(service.ws_uri);
		ws.on('open', function open() {
  		debug('Service', id, 'is up');
			ws.close(1000, 'KTHXBAI');
			ws.terminate();
			conf.set(id+'.reachable', true);
		});
		ws.on('error', function open() {
			debug('Service', id, 'is unreachable');
			conf.set(id+'.reachable', false);
		});
  }
}
