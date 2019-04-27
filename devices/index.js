'use strict';

/*
 * The idea here is to keep devices in separate files.
 * This index file just instantiates the devices we want plus whatever else
 * we need at startup.
 */

const neeoapi = require('neeo-sdk');
const kodiDiscovery = require('../lib/kodiDiscovery');
const kodiDevice = require('./kodiDevice').device;

module.exports = {
  devices: [
    kodiDevice,
  ]
};
