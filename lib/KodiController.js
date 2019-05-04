'use strict';

const debug = require('debug')('neeo-driver-kodi:KodiController');
const debugData = debug.extend('data');
const conf = require('./Configstore');
const BluePromise = require('bluebird');
const KodiBrowser = require('./KodiBrowser');
const KodiClient = require('./KodiClient');
const kodiCommands = require('../lib/kodiCommands');
const axios = require('axios');

module.exports = class KodiController {

  constructor() {
    debug('CONSTRUCTOR');
    this._kodiInstances = conf.get('kodi_instances');
    this._kodiClients = {};
    this._kodiBrowsers = {};
    for(let id in this._kodiInstances) {
      if(this._kodiInstances[id].address) {
        this._kodiClients[id] = new KodiClient(id, this);
        this._kodiBrowsers[id] = new KodiBrowser(id, this._kodiClients[id]);
      }
    };
    this._sendComponentUpdate = undefined;
  }

  static build() {
    return new KodiController();
  }

  initialise() {
    debug('initialise()');
  }


  register(credentials) {
    debug('register()', credentials);
    return new BluePromise((resolve, reject) => {
      // FIXME: This can't be the proper way to do this?
      var resolved = {};
      for(let id in this._kodiInstances) {
        resolved[id] = undefined;
      }
      var resolve_interval = setInterval(() => {
        for(let id in resolved) {
          if(resolved[id] == true) {
            clearInterval(resolve_interval);
            resolve();
          }
          if(resolved[id] == undefined) {
            return;
          }
        }
        clearInterval(resolve_interval);
        const invalidCodeError = new Error('Incorrect username or password.');
        reject(invalidCodeError);
      }, 1000);

      try {
        let username = credentials.username;
        let password = credentials.password;

        for(let id in this._kodiInstances) {
          registered = conf.get('kodi_instances.' + id + '.registered');
          if(registered == true) {
            resolved[id] = true;
            continue;
          }
          var uri = conf.get('kodi_instances.' + id + '.http_uri');
          var request_config = {
            url: uri,
            method: 'post',
            headers: {'Content-Type': 'application/json'},
            data: JSON.stringify({ jsonrpc: "2.0", method: "JSONRPC.Ping", id: 1 }),
            auth: { username: username, password: password },
            responseType: 'json',
          };
          var instance = axios.create(request_config);
          instance.post(uri, request_config)
            .then(function (response) {
              if(response.status == 200) {
                conf.set('kodi_instances.' + id + '.auth', true);
                conf.set('kodi_instances.' + id + '.registered', true);
                conf.set('kodi_instances.' + id + '.username', username);
                conf.set('kodi_instances.' + id + '.password', password);
                resolved[id] = true;
              }
            })
            .catch(function (error) {
              resolved[id] = false;
            });
        }
      } catch(err) {
        console.log('ERROR', err);
      }
    });
  }

  isRegistered(data) {
    debug('isRegistered()', this._registered);
    return BluePromise.resolve(this._registered);
  }


  discoverDevices() {
    debug('discoverDevices()');
    var devices = [];
    for(let id in this._kodiInstances) {
      let i = conf.get('kodi_instances.' + id);
      let d = {id: i.id, name: i.name, reachable: i.reachable};
      debug(d);
      devices.push(d);
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

  test(foo) {
    return 'Tetsetd'+Date.now();
  }

  getTextLabelValue(device_id, label_id) {
    debug('getTextLabelValue()', device_id, label_id);
    var value = undefined;
    switch(label_id) {
      case 'LABEL_NOWPLAYINGTITLE':
        value = this._kodiClients[device_id].kodiState.getMedia('caption') || 'N/A';
        break;
      case 'LABEL_NOWPLAYINGDESCRIPTION':
        value = this._kodiClients[device_id].kodiState.getMedia('description') || 'N/A';
        break;
    }
    debug('getTextLabelValue()', value);
    return value;
  }

  sensorValue(device_id, sensor_id) {
    debug('sensorValue', device_id, sensor_id);
  }

  listAction(deviceId, params) {
    debug('listAction', deviceId, params);
  }

  setNotificationCallbacks(updateCallback, optionalCallbacks) {
    debug('setNotificationCallbacks()');
    this._sendComponentUpdate = updateCallback;
  }

  sendComponentUpdate(device_id, component_id, component_value) {
    debug('sendComponentUpdate()', device_id, component_id, component_value);
    if(this._sendComponentUpdate) {
      debug('sendComponentUpdate() SENT');
      this._sendComponentUpdate({
        uniqueDeviceId: device_id,
        component: component_id,
        value: component_value
      }).catch((error) => {
        // sendComponentUpdate returns a Promise
        // adding a catch is needed to prevent an unhandled rejection.
        console.error('NOTIFICATION_FAILED', error.message);
      });
    }
  }

};
