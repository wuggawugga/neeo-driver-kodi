const conf = require('./Configstore');
const mdns = require('mdns-js');

const MDNS_TIMEOUT = 3000;

var mdns_browser = mdns.createBrowser('_xbmc-jsonrpc-h._tcp');
var mdns_timeout_id = setTimeout(endDiscovery, MDNS_TIMEOUT);

mdns_browser.on('ready', function() {
		beginDiscovery();
});

mdns_browser.on('update', function(data) {
	clearTimeout(mdns_timeout_id);
	mdns_timeout_id = setTimeout(endDiscovery, MDNS_TIMEOUT);
	saveDevice(data);
});

function beginDiscovery() {
	mdns_browser.discover();
}

function endDiscovery() {
	mdns_browser.stop();
}

function saveDevice(data) {
	if(data.fullname.endsWith('_xbmc-jsonrpc-h._tcp.local')) {
		let device = {
			address: data.addresses[0],
			port: data.port,
			reachable: true,
			mdns_data: data
		};
		let name = data.fullname.substring(0, data.fullname.indexOf('.'));
		conf.set(name, device);
		console.log('- Kodi instance discovered: ' + name);
	}
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
