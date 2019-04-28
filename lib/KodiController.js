'use strict';


const BluePromise = require('bluebird');
const debug = require('debug')('neeo-driver-kodi:KodiController');
const conf = require('./Configstore');
const KodiClient = require('./KodiClient');
const kodiCommands = require('../lib/kodiCommands');



module.exports = class KodiController {

  constructor(service) {
    debug('CONSTRUCTOR');
    let id = service.id;
    this._id = id;
    this._name = service.name;
    this._address = service.address;
    this._port = service.port;
    this._registered = false;
    this._reachable = true;
    this._client = new KodiClient(id);
    debug(this.toString());
  }

  static build(service) {
    return new KodiController(service);
  }

  toString() {
    return 'Name: ' + this._name + ' Address: ' + this._address;
  }

  save() {

  }

  initialise() {
    debug('initialise()');
  }

  discoverDevices() {
    debug('discoverDevices()');
    const devices = [{
      id: this._id,
      name: this._name,
      reachable: this._reachable,
    }];
    debug(devices);
    return devices;
  }

  onButtonPressed(id, deviceId) {
    // TODO implement the actions for your device here
    debug(`[CONTROLLER] ${id} button pressed for device ${deviceId}`);
    debug('Sending ' + kodiCommands[id].method + ', ' + kodiCommands[id].params);
    this._client.sendCommand(kodiCommands[id].method, kodiCommands[id].params);
  }

};
