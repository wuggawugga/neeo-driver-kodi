const debug = require('debug');
debug.enable('neeo-driver-kodi:kodiDiscovery');
const conf = require('../lib/kodiDiscovery');
setTimeout(() => {process.exit(0)}, 30000);
