'use strict';

/*
 *  KodiController: Singleton class, hub for all Kodi instances.
 *  Drivers connect to the controller, the controller connects (via clients)
 *  to Kodi.
 */

const debug = require('debug')('neeo-driver-kodi:KodiController');
const debugData = debug.extend('data');
const conf = require('./Config');
const BluePromise = require('bluebird');
const KodiBrowser = require('./KodiBrowser');
const KodiClient = require('./client');
const kodiCommands = require('./kodiCommands');
const axios = require('axios');
const md5 = require('./functions').md5;
const receptacle = require('./Receptacle').image_cache;
const fileType = require('file-type');


class KodiController {

  constructor() {
    debug('CONSTRUCTOR');
    this.initialise();
    this.clients = {};
    this.browsers = {};
    for(let id in this.instances) {
      if(this.instances[id].address) {
        let client = this.clients[id] = new KodiClient(id, this);
        let library = this.browsers[id] = new KodiBrowser(id, this, client);
      }
    };
    this._componentUpdateCallbacks = {};
    this.defaultThumbnail = conf.get('default_thumbnail');
    this.httpServiceUrl = conf.get('localhost.url');
  }

/*
  static build() {
    return new KodiController();
  }
*/

  initialise(deviceidentifier) {
    debug('initialise()', deviceidentifier);
    this.instances = conf.get('kodi_instances');
  }

  register(credentials) {
    debug('register()', credentials);
    return new BluePromise((resolve, reject) => {
      // FIXME: This can't be the proper way to do this?
      var resolved = {};
      for(let id in this.instances) {
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

        for(let id in this.instances) {
          let registered = conf.get('kodi_instances.' + id + '.http_registered');
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
                conf.set('kodi_instances.' + id + '.http_auth', true);
                conf.set('kodi_instances.' + id + '.http_registered', true);
                conf.set('kodi_instances.' + id + '.http_username', username);
                conf.set('kodi_instances.' + id + '.http_password', password);
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

  isRegistered(foo, bar) {
    debug('isRegistered()', foo, bar);
    // Caveat: NEEO doesn't provide any data here, so we can olny return true
    // if all devices are registered.
    let registered = true;
    for(let id in this.instances) {
      if(this.instances.http_registered == false) {
        registered = false;
        break;
      }
    }
    debug('isRegistered()', registered);
    return BluePromise.resolve(registered);
  }

  discoverDevices() {
    debug('discoverDevices()');
    this.initialise();
    var devices = [];
    for(let id in this.instances) {
      let i = conf.get('kodi_instances.' + id);
      let d = {id: i.id, name: i.name, reachable: i.reachable};
      debug(d);
      devices.push(d);
    }
    return devices;
  }

  onButtonPressed(button_id, device_id) {
    debug('onButtonPressed()', button_id, '@', device_id);
    let method = kodiCommands.commands[button_id].method;
    let params = kodiCommands.commands[button_id].params;
    debug('onButtonPressed() Method:', method, '; params:', params);
    if(method == 'INTERNAL') {
      switch(params.action) {
        case 'WoL':
          this.clients[device_id].wakeDevice();
          break;
      }
    } else {
      this.clients[device_id].send(method, params).catch((e) => {
//        throw e;
        debug('CATCH', e);
      }).then((foo) => {
        debug('THEN', foo);
      }).finally((bar) => {
        debug('FINALLY', bar);
      });
    }
  }

  browseDirectory(device_id, directory_id, params_in) {
    debug('browseDirectory()', device_id, directory_id, params_in);
    var list = this.browsers[device_id].browseDirectory(directory_id, params_in);
    debug('browseDirectory() returns', list.constructor.name);
    return list;
/*
    this.browsers[device_id].browseDirectory(directory_id, params_in).then((list) => {
      debug('browseDirectory() returns', list.constructor.name);
      return list;
    });
*/
  }

  listAction(device_id, directory_id, params) {
    debug('listAction()', device_id, directory_id, params);
    return new BluePromise((resolve, reject) => {
      try {
        if(params.actionIdentifier) {
          var argv = params.actionIdentifier.split('/');
          var context = argv[0];
          var method = argv[1];
          var args = [];
          if(argv.length > 3) {
            args = argv.slice(2);
          } else {
            args = argv[2];
          }
          switch(context) {
            case 'KodiBrowser':
              let browser = this.browsers[device_id];
              if(browser[method]) {
                resolve(browser[method](args));
              }
              break;
            case 'KodiLibrary':
              let library = this.browsers[device_id].library;
              if(library[method]) {
                resolve(library[method](args));
              }
              break;
            case 'Internal':
              debug('INTERNAL', method);
              switch(method) {
                case 'playSong':
                  this.clients[device_id].send('Player.Open', {item: {songid: parseInt(args)}});
                  break;
                case 'playAlbum':
                  break;
                case 'queueSong':
                  this.clients[device_id].send('Playlist.Add', {playlistid: 0, item: {songid: parseInt(args)}});
                  break;
                case 'queueAlbum':
                  break;
                case 'goToPlaylistItem':
                  debug('GOTO', argv.join(', '));
                  let active_player = parseInt(argv[2]);
                  let playlist_pos = parseInt(argv[3]);
                  let params = {playerid: active_player, to: playlist_pos};
                  this.clients[device_id].send('Player.GoTo', params);
                  break;
                case 'getActivePlayer':
                  this.clients[device_id].state.getActivePlayer();
                  break;
                case 'getPlayerProperties':
                  this.clients[device_id].state.getPlayerProperties(args);
                  break;
                case 'getPlayerItem':
                this.clients[device_id].state.getPlayerItem(args);
                break;
              }
            default:
              reject('Method ' + context + '.' + method + ' not found');
          }
        }
      } catch(error) {
        debug('ERROR', error);
      }
    });
  }

  getImageUrl(device_id, image_id) {
    debug('getImageUrl()', device_id, image_id);
    var size = 480;
    switch(image_id) {
      case 'IMAGE_NOW_PLAYING_THUMBNAIL_LARGE':
        size = 454;
        break;
      case 'IMAGE_NOW_PLAYING_THUMBNAIL_SMALL':
        size = 100;
        break;
    }
    var url = [this.httpServiceUrl, 'image', size, this.defaultThumbnail].join('/');
    if(this.clients[device_id].state.media.item.thumbnail) {
      url = this.fetchKodiImage(device_id, this.clients[device_id].state.media.item.thumbnail, size);
/*
      let internal_url = this.clients[device_id].state.media.item.thumbnail;  // image://http%3a%2f%2fimage.tmdb.org%2ft%2fp%2foriginal%2faQkXOiMi7yBR3XwDbGBzDI2Tqnq.jpg/
      let external_url = this.kodiUrl(device_id, internal_url);  // http://192.168.1.31:8080/vfs/image%3A%2F%2Fhttp%253a%252f%252fimage.tmdb.org%252ft%252fp%252foriginal%252faQkXOiMi7yBR3XwDbGBzDI2Tqnq.jpg%2F
      let hash = this.fetchImage(device_id, external_url);
      if(hash) {
        url = [this.httpServiceUrl, 'image', size, hash].join('/') + '.jpg';
      } else {
        url = external_url;
      }
      */
    }
    debug('getImageUrl()', url);
    return url;
  }

  // FIXME: Move all the image stuff to somewhere else. It hardly belongs here.

  /*
   *  Fetch and cache a Kodi-hosted image
   */
  fetchKodiImage(device_id, internal_url, size_in) {
    debug('fetchKodiImage()');
    let size = size_in || 480;
    if(internal_url == undefined || internal_url == '') {
        return [this.httpServiceUrl, 'image', size, this.defaultThumbnail].join('/');
    }
    let external_url = this.kodiUrl(device_id, internal_url);
    setTimeout(() => {this.fetchImage(device_id, external_url)}, 5);
    let url_out = this.getLocalImageUrl(external_url, size);
    debug('OUT', url_out);
    return url_out;
  }

  /*
   *  Fetch any image via HTTP and store it in cache. Returns cache key
   */
  fetchImage(device_id, image_url) {
    debug('fetchImage()', device_id, image_url);
    var hash = md5(image_url);
    if(receptacle.has(hash)) {
      return hash;
    }
    axios.get(image_url, {responseType: 'arraybuffer'})
    .then(function (response) {
      if(response.status == 200) {
        var image = Buffer.from(response.data, 'binary');
        // Kodi doesn't send a content-type header
        const type = fileType(image);
        receptacle.set(hash, {type: type, data: image});
        return hash;
      }
      return false;
    })
    .catch(function (error) {
      debug(error);
    });
  }

  /*
   *  Build URL for Kodi web interface
   */
  kodiUrl(device_id, target_url) {
    let url = 'http://';
    if(this.instances[device_id].http_auth == true) {
      url += this.instances[device_id].http_username + ':' + this.instances[device_id].http_password + '@';
    }
    url += this.instances[device_id].address + ':' + this.instances[device_id].http_port + '/vfs/';
    url += encodeURIComponent(target_url);
    return url;
  }

  /*
   *  Build URL for local cached image
   */
  getLocalImageUrl(image_url, size_in) {
    let size = size_in || 480;
    let hash = md5(image_url);
    let url = [this.httpServiceUrl, 'image', size, hash].join('/') + '.jpg';
    debug('getLocalImageUrl()', url);
    return url;
  }

  getTextLabel(device_id, label_id) {
    debug('getTextLabelValue()', device_id, label_id);
    var value = undefined;
    switch(label_id) {
      case 'LABEL_NOW_PLAYING_CAPTION':
        value = this.clients[device_id].state.getMedia('caption') || 'N/A';
        break;
      case 'LABEL_NOW_PLAYING_DESCRIPTION':
        value = this.clients[device_id].state.getMedia('description') || 'N/A';
        break;
    }
    debug('getTextLabelValue() Return', value);
    return value;
  }

  getSensorValue(device_id, sensor_id) {
    debug('getSensorValue', device_id, sensor_id);
    switch(sensor_id) {
      case 'SLIDER_VOLUME':
        let volume = this.clients[device_id].state.get('state.volume');
        return volume;
        break;
      case 'SWITCH_MUTE':
        let mute = this.clients[device_id].state.get('state.muted');
        return mute;
        break;
    }
  }

  setSensorValue(device_id, sensor_id, value_in) {
    debug('setSensorValue', device_id, sensor_id, value_in);
    switch(sensor_id) {
      case 'SLIDER_VOLUME':
        this.clients[device_id].send('Application.SetVolume', {volume: parseInt(value_in)});
        return value_in;
        break;
      case 'SWITCH_MUTE':
        this.clients[device_id].send('Application.SetMute', {mute: value_in});
        return value_in;
        break;
    }
  }

  /*
   *  https://planet.neeo.com/t/x1ppnc/componentname_not_found
   *  After I added deviceidentifier, I noticed an extra call from the SDK
   *  with an undefined identifier. Now I just add each (valid) callback to
   *  the list and send notifications to all of them. It's ugly but seems to work.
   *  I've had no luck trying to find a clean way to do this.
   */
  setNotificationCallbacks(updateCallback, optionalCallbacks, deviceidentifier) {
    debug('setNotificationCallbacks()', deviceidentifier);
    if(deviceidentifier) {
      this._componentUpdateCallbacks[deviceidentifier] = updateCallback;
    }
  }

  /*
   *  Currently we are sending all notifications to all callbacks and ignoring
   *  the errors.
   *  FIXME: Test if the loop is actually necessary. The fault might just have
   *    been caused by the extra setNotificationCallbacks() call with
   *    no deviceidentifier.
   */
  sendComponentUpdate(device_id, component_id, component_value) {
    debug('sendComponentUpdate()', device_id, component_id, component_value);
    if(Object.keys(this._componentUpdateCallbacks).length > 0) {
      // if(!component_id.endsWith('_SENSOR')) {
      //   this.sendComponentUpdate(device_id, component_id+'_SENSOR', component_value);
      // }
      for(const [id, callback] of Object.entries(this._componentUpdateCallbacks)) {
        debug('Sending', component_id, 'update to', id);
        var result = callback({
          uniqueDeviceId: device_id,
          component: component_id,
          value: component_value
        }).catch((error) => {
          // sendComponentUpdate returns a Promise
          // adding a catch is needed to prevent an unhandled rejection.
          debug('NOTIFICATION_FAILED', error.message, id);
        });
      }
    }
  }

};

var kodiController = new KodiController();

module.exports = kodiController;
