'use strict';

const debug = require('debug')('neeo-driver-kodi:kodiDiscovery');
const bonjour = require('bonjour')();
const BluePromise = require('bluebird');
const WebSocket = require("ws");
const conf = require('./Configstore');

const MDNS_TIMEOUT = 3000;

debug('Starting mDNS discovery');

var browser = bonjour.find({ type: 'xbmc-jsonrpc' });
var mdns_timeout_id = setTimeout(endDiscovery, MDNS_TIMEOUT);

browser.on('up', function(data) {
	clearTimeout(mdns_timeout_id);
	mdns_timeout_id = setTimeout(endDiscovery, MDNS_TIMEOUT);

	debug('Kodi instance discovered:', data.name);
	let service = {
		id: data.txt.uuid,
		name: data.name,
		host: data.host,
		address: data.addresses[0],
		port: data.port,
		fqdn: data.fqdn,
		uuid: data.txt.uuid,
		username: null,
		password: null,
		reachable: true,
		auth: null
	};
	conf.set(service.id, service);
	probeService(service);
});

function endDiscovery() {
	debug('Ending mDNS discovery');
	browser.stop();
}

function probeService(service) {
	// Probe for auth and stuff
/*
	debug('Probing', service.name);
	return new BluePromise((resolve, reject) => {
		let ws = new WebSocket(`ws://${service.address}:${service.port}/jsonrpc`);

		var str_ping = '{"jsonrpc": "2.0", "method": "JSONRPC.Ping", "id": "1"}';
		var str_mac = '{"jsonrpc": "2.0", "method": "XBMC.GetInfoLabels", "params": {"labels": ["Network.MacAddress"]}, "id": "1"}';

		ws.on("open", () => {
			ws.send(str_mac, error => {
		    if (error) {
		      console.log("ERROR getting MAC");
		    }
		  });
    });

		ws.on("message", message => {
			debug('MESSAGE', message);
		});

		const to = setTimeout(() => {
      ws.close();
      reject("Failed to send message. No response within timeout.");
    }, 5000);


	});
*/
}


/*

//Add a found kodi to the database.
function addKoditoDB(discoveredData) {
  const ip = discoveredData.addresses[0];
  const httpPort = discoveredData.port;
  const reachable = true;
  const name = discoveredData.fullname.replace(/\._xbmc-jsonrpc-h\._tcp\.local/g, "");
  const username = "kodi"; // Preparation for user pass setting.
  const password = "kodi"; // Preperation for user pass setting.

  kodiConnector.getMac(ip).then(mac => {
    console.log(`KODIdb:  Discovered KODI instance with IP:${ip}, PORT:${httpPort}, MAC:${mac}, NAME:${name}.`);
    const ws = new kodiConnector(mac, ip, httpPort, username, password);
    kodiDB[mac] = { name, ip, httpPort, mac, reachable, ws };

    kodiDB[mac].ws.events.on("notification", x => {
      handleKodiEvents(x);
    });

    kodiDB[mac].ws.events.on("connected", x => {
      setTimeout(() => {
        conectedMessage(x.mac);
      }, 5000);
    });

    if (mac == discoveryConnect) {
      kodiDB[mac].ws.connect();
    }
  });
}
*/
