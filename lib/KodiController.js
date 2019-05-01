'use strict';

const BluePromise = require('bluebird');
const debug = require('debug')('neeo-driver-kodi:KodiController');
const conf = require('./Configstore');
const KodiBrowser = require('./KodiBrowser');
const KodiClient = require('./KodiClient');
const kodiCommands = require('../lib/kodiCommands');

module.exports = class KodiController {

  constructor() {
    debug('CONSTRUCTOR');
    this._kodiInstances = conf.all;
    this._kodiClients = {};
    this._kodiBrowsers = {};
    for(let id in this._kodiInstances) {
      this._kodiClients[id] = new KodiClient(id);
      this._kodiBrowsers[id] = new KodiBrowser(id, this._kodiClients[id]);
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
    debug('onButtonPressed', button_id, '@', device_id);
    let method = kodiCommands.commands[button_id].method;
    let params = kodiCommands.commands[button_id].params;
    debug('Method:', method, '; params:', params);
    if(method == 'INTERNAL') {
      switch(params.action) {
        case 'WoL':
          this._kodiClients[device_id].wakeDevice();
          break;
      }
    } else {
      this._kodiClients[device_id].sendCommand(method, params);
    }
  }

  browse(deviceId, params, foo) {
    debug('browse', deviceId, params, foo);
    const listOptions = {
      limit: params.limit || 64,
      offset: params.offset || 0,
      browseIdentifier
    };
  }

  browseq() {}
  browsew() {}

  listAction(deviceId, params) {
    debug('listAction', deviceId, params);
  }


};
