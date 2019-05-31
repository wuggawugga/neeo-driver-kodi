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
const conf = require('../lib/Config');
const kodiDiscovery = require('../lib/kodiDiscovery');
const httpInterface = require('../lib/httpInterface');
const Netmask = require('netmask').Netmask;
const http = require('http');

var instances = conf.get('kodi_instances');

neeoapi.discoverOneBrain(true).then((brain) => {
  conf.set('neeo.brain', brain);
  // This is going to get messy...
  neeoapi.getRecipes(brain).then((recipes) => {
    sillyWalk(recipes);
  });
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
    console.error('CANNOT BRAIN', error);
    process.exit(1);
});

// This is a terrible way to get adapterName for each device
function sillyWalk(recipes) {
  let rooms = {};
  for(let [i, recipe] of Object.entries(recipes)) {
    for(let [j, url] of Object.entries(recipe.url)) {
      let found = url.match(/(.*)\/rooms\/(.*)\/recipes.*/);
      if(found) {
        let room = found[1] + '/rooms/' + found[2];
        rooms[found[2]] = room;
      }
    }
  }
  for(let [room, url] of Object.entries(rooms)) {
    http.get(url, (res) => {
      res.setEncoding('utf8');
      let rawData = '';
      res.on('data', (chunk) => { rawData += chunk; });
      res.on('end', () => {
        try {
          const parsedData = JSON.parse(rawData);
          if(parsedData) {
            if(parsedData.name) {
//              console.log(parsedData.devices);
              for(let [deviceName, device] of Object.entries(parsedData.devices)) {
                let device_id = device.adapterDeviceId;
                if(Object.keys(instances).includes(device_id)) {
/*
                  device.macros = null;
                  device.switches = null;
                  device.directories = null;
                  device.imageurls = null;
                  device.textlabels = null;
                  device.sliders = null;
                  device.sensors = null;
                  console.log(device);
                  console.log(device.details);
*/
                  conf.set('kodi_instances.' + device_id + '.sourceName', device.details.sourceName);
                  conf.set('kodi_instances.' + device_id + '.adapterName', device.details.adapterName);
                }
              }
//              process.exit(0);
            }
          }
        } catch (e) {
          console.error(e.message);
        }
      });
    });
  }
}

module.exports = {
  devices: [
    ...kodiDevice.devices
  ]
};
