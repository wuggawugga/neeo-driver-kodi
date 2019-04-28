'use strict';

/*
 * The idea here is to keep devices in separate files.
 * This index file just instantiates the devices we want plus whatever else
 * we need at startup.
 */

const neeoapi = require('neeo-sdk');
const kodiDiscovery = require('../lib/kodiDiscovery');
const dummyDevice = require('./dummyDevice');
const kodiDevice = require('./kodiDevice');

module.exports = {
  devices: [
    ...dummyDevice.devices,
    ...kodiDevice.devices
  ]
};
