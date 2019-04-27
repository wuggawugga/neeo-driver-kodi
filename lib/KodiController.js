'use strict';

//const neeoapi = require('neeo-sdk');
const conf = require('./Configstore');

//const deviceState = neeoapi.buildDeviceState();


module.exports = class KodiController {

  constructor() {
  }

  initialise(data) {
    console.log('kodiController.initialise');
    console.log('Data: ' + data);
  }

  static build() {
    return new KodiController();
  }

  onButtonPressed(name, deviceId) {
    // TODO implement the actions for your device here
    console.log(`[CONTROLLER] ${name} button pressed for device ${deviceId}`);
  }

  discover() {
    // This is called by the SDK when the user has selected the Kodi device.
    console.log('kodiController.discover');
    let devices = [];
    let data = conf.all;
    for (let key in data) {
      let device = {
        id: key,
        name: key,
        reachable: true
      };
      devices.push(device);
    }
    return devices;
  }

  register(credentials) {
    // At this point we have no idea which Kodi instance this is for
    console.log('kodiController.register');
    console.log(credentials);
    conf.set('credentials', credentials);
  }

  isRegistered(data) {
    console.log('kodiController.isRegistered');
    console.log('Data: ' + data);
    return false;
  }

};
