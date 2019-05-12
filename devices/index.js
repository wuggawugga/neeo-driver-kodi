'use strict';

/*
 * The idea here is to keep devices in separate files.
 * This index file just instantiates the devices we want plus whatever else
 * we need at startup.
 * Caveat:
 *  This escalated a bit, since we need to reliably determine the local IP address
 */

const neeoapi = require('neeo-sdk');
const kodiDevice = require('./kodiDevice');
const os = require('os');
const conf = require('../lib/Configstore');
const kodiDiscovery = require('../lib/kodiDiscovery');
const httpInterface = require('../lib/httpInterface');
const Netmask = require('netmask').Netmask;

neeoapi.discoverOneBrain(true).then((brain) => {
  conf.set('brain', brain);
  // Determine which local NIC is in the same network as the brain
  let nics = os.networkInterfaces();
  for(const [name, nic] of Object.entries(nics)) {
    for(const address of nic) {
      if(address.family == 'IPv4') {
        let block = new Netmask(address.cidr);
        // FIXME: add a loop here to account for multiple brain IPs
        if(block.contains(brain.iparray[0])) {
          conf.set('localhost.net', address);
          let port = conf.get('localhost.http_port');
          let url = 'http://' + address.address + ':' + port;
          conf.set('localhost.url', url);
        }
      }
    }
  }
}).catch(error => {
    console.error('BRAIN HURTS', error);
    process.exit(1);
});

module.exports = {
  devices: [
    ...kodiDevice.devices
  ]
};
