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
    this._username = null;
    this._password = null;
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

  register(credentials) {
    debug('register()', credentials);

    return new BluePromise((resolve, reject) => {

      if (!credentials) {
        const error = new Error('INVALID_PAYLOAD_DATA');
        error.status = 400;
        throw error;
      }
      const USERNAME = 'kodi';
      const PASSWORD = 'kodi';
      if (credentials.username === USERNAME && credentials.password === PASSWORD) {
        this._registered = true;
        this._username = credentials.username;
        this._password = credentials.password;
        conf.set(this._id + '.username', credentials.username);
        conf.set(this._id + '.password', credentials.password);
        resolve();
      }

      const invalidCodeError = new Error('Incorrect username or password.');
      reject(invalidCodeError);
    });

  }

  isRegistered(data) {
    debug('isRegistered()', this._registered);
    return BluePromise.resolve(this._registered);
  }

  onButtonPressed(id, deviceId) {
    // TODO implement the actions for your device here
    debug(`[CONTROLLER] ${id} button pressed for device ${deviceId}`);
    debug('Sending ' + kodiCommands[id].method + ', ' + kodiCommands[id].params);
    this._client.sendCommand(kodiCommands[id].method, kodiCommands[id].params);
  }

};
