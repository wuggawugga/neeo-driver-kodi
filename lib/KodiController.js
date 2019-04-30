'use strict';

const BluePromise = require('bluebird');
const debug = require('debug')('neeo-driver-kodi:KodiController');
const conf = require('./Configstore');
const KodiClient = require('./KodiClient');
const kodiCommands = require('../lib/kodiCommands');

module.exports = class KodiController {

  constructor() {
    debug('CONSTRUCTOR');
    this._kodiInstances = conf.all;
    this._kodiClients = {};
    for(let id in this._kodiInstances) {
      this._kodiClients[id] = new KodiClient(id);
    };
  }

  static build() {
    return new KodiController();
  }

  initialise() {
    debug('initialise()');
  }

  discoverDevices() {
    debug('discoverDevices()');
    var devices = [];
    for(let id in this._kodiInstances) {
      let d = conf.get(id);
      devices.push({id: d.id, name: d.name, reachable: d.reachable});
    }
    return devices;
  }

  onButtonPressed(button_id, device_id) {
    let method = kodiCommands[button_id].method;
    let params = kodiCommands[button_id].params;
    debug('Button', button_id, '@', device_id);
    debug('Method:', method, '; params:', params);
    this._kodiClients[device_id].sendCommand(method, params);
  }

};
