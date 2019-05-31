'use strict';

/*
 *  KodiController: Hub for all Kodi instances.
 *  Drivers connect to the controller, the controller connects (via clients)
 *  to Kodi.
 */

const debug = require('debug')('neeo-driver-kodi:KodiController');
const debugData = debug.extend('data');
const BluePromise = require('bluebird');
const conf = require('./Config');
const KodiBrowser = require('./KodiBrowser');
const KodiClient = require('./client');
const kodiCommands = require('./kodiCommands');
const keymap = require('./kodiKeymap');

class KodiController {

  constructor() {
    debug('CONSTRUCTOR');
    this.initialise();
    this.clients = {};
    this.browsers = {};
    this._componentUpdateCallbacks = {};
    this._adapters = {};
    for(let id in this.instances) {
      if(this.instances[id].address) {
        let client = this.clients[id] = new KodiClient(id, this);
        let library = this.browsers[id] = new KodiBrowser(id, this, client);
      }
      if(this.instances[id].adapterName) {
        this._adapters[id] = this.instances[id].adapterName;
//        this._adapters[this.instances[id].adapterName] = id;
      }
    };
//    debug(this._adapters);
    this.thumbnail_widths = conf.get('thumbnail_widths');
  }

  initialise(deviceidentifier) {
    debug('initialise()', deviceidentifier);
    this.instances = conf.get('kodi_instances');
  }

  onButtonPressed(button_id, device_id) {
    debug('onButtonPressed()', button_id, '@', device_id);
    this.clients[device_id].state.getCurrentWindow().then(async (window) => {
      let cmd = keymap.map(button_id, window);
      let method = kodiCommands.commands[cmd].method;
      let params = kodiCommands.commands[cmd].params || {};
      if(params.playerid === null) {
        params.playerid = await this.clients[device_id].state.getActivePlayer();
      }
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
    });
  }

  browseDirectory(device_id, directory_id, params_in) {
    debug('browseDirectory()', device_id, directory_id, params_in);
    var list = this.browsers[device_id].browseDirectory(directory_id, params_in);
    return list;
  }

  listAction(device_id, directory_id, params) {
    debug('listAction()', device_id, directory_id, params);
    return new BluePromise((resolve, reject) => {
      try {
        if(params.actionIdentifier) {
          var argv = params.actionIdentifier.split('|');
          var context = argv[0];
          var method = argv[1];
          var args = argv.slice(2);
          var params_out = {};

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
            case 'Player':
              switch(method) {
                case 'goToPlaylistItem':
                  debug('GOTO', argv.join(', '));
                  let active_player = parseInt(argv[2]);
                  let playlist_pos = parseInt(argv[3]);
                  params_out = {playerid: active_player, to: playlist_pos};
                  this.clients[device_id].send('Player.GoTo', params_out);
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
                case 'Open':
                  params_out = { item: { file: args[0] } };
                  this.clients[device_id].send('Player.Open', params_out);
                  break;
              }
            case 'AudioPlayer':
              switch(method) {
                case 'playSong':
                  this.clients[device_id].send('Player.Open', {item: {songid: parseInt(args[0])}});
                  resolve(true);
                  break;
                case 'playAlbum':
                  this.clients[device_id].send('Playlist.Clear', {playlistid: 0})
                  .then(() => {
                    this.clients[device_id].send('Playlist.Add', {playlistid: 0, item: {albumid: parseInt(args[0])}})
                    .then(() => {
                      this.clients[device_id].send('Player.Stop', {playerid: 0});
                      if(args.length > 1) {
                        this.clients[device_id].send('Player.Open', {item: {playlistid: 0, position: parseInt(args[1])}});
                      } else {
                        this.clients[device_id].send('Player.Open', {item: {playlistid: 0, position: 0}});
                      }
                      resolve(true);
                    })
                  });
                  break;
                case 'queueMusicVideo':
                  this.clients[device_id].send('Playlist.Add', {playlistid: 1, item: {musicvideoid: parseInt(args[0])}});
                  resolve(true);
                  break;
                case 'queueSong':
                  this.clients[device_id].send('Playlist.Add', {playlistid: 0, item: {songid: parseInt(args[0])}});
                  resolve(true);
                  break;
                case 'queueAlbum':
                  this.clients[device_id].send('Playlist.Add', {playlistid: 0, item: {albumid: parseInt(args[0])}});
                  resolve(true);
                  break;
              }
              break;
            case 'VideoPlayer':
              debug('VideoPlayer', method);
              switch(method) {
                case 'playMovie':
                  this.clients[device_id].send('Player.Open', {item: {movieid: parseInt(args[0])}});
                  break;
                case 'queueMovie':
                  break;
                case 'playMusicVideo':
                  this.clients[device_id].send('Player.Open', {item: {musicvideoid: parseInt(args[0])}});
                  break;
                case 'queueMusicVideo':
                  break;
                case 'cycleRepeat':
                  this.clients[device_id].send('Player.SetRepeat', {playerid: 1, repeat: "cycle"}).then(() => {
                    this.clients[device_id].state.getPlayerProperties(1).then((player) => {
                      let message = { title: 'NEEO', message: 'REPEAT: ' + player.repeat.toUpperCase(), displaytime: 3000 };
            					this.clients[device_id].send('GUI.ShowNotification', message);
                    });
                  });
                  break;
                case 'toggleShuffle':
                  this.clients[device_id].send('Player.SetShuffle', {playerid: 1, shuffle: "toggle"}).then(() => {
                    this.clients[device_id].state.getPlayerProperties(1).then((player) => {
                      let message = { title: 'NEEO', message: 'SHUFFLE: ' + player.shuffled.toString().toUpperCase(), displaytime: 3000 };
            					this.clients[device_id].send('GUI.ShowNotification', message);
                    });
                  });
                  break;
              }
              break;
            case 'Internal':
              debug('INTERNAL', method);
              switch(method) {
                case 'ActivateWindow':
                  params_out = { window: args[0], parameters: [args[1]] };
                  debug('ActivateWindow', params_out);
                  this.clients[device_id].send('GUI.ActivateWindow', params_out);
                  break;
                case 'ExecuteAddon':
                  params_out = { addonid: args[0], params: [args[1]] };
                  debug('ActivateWindow', params_out);
                  this.clients[device_id].send('GUI.ActivateWindow', params_out);
                  break;
              }
              break;
            default:
              reject('Method ' + context + '.' + method + ' not found');
          }
        }
      } catch(error) {
        debug('ERROR', error);
      }
    });
  }

  async getImageUrl(device_id, image_id) {
    debug('getImageUrl()', device_id, image_id);
    var size = 480;
    switch(image_id) {
      case 'IMAGE_NOW_PLAYING_THUMBNAIL_LARGE':
        size = this.thumbnail_widths.large;
        break;
      case 'IMAGE_NOW_PLAYING_THUMBNAIL_SMALL':
        size = this.thumbnail_widths.small;
        break;
    }
    let thumb = this.clients[device_id].state.get('media.item.thumbnail');
    debug('getImageUrl() THUMB', thumb);
    let url_out = await this.clients[device_id].getKodiImage(thumb, size);
    debug('getImageUrl() OUT', url_out);
    return url_out;
  }

  getTextLabel(device_id, label_id) {
    debug('getTextLabel()', device_id, label_id);
    var value = undefined;
    switch(label_id) {
      case 'LABEL_NOW_PLAYING_CAPTION':
        value = this.clients[device_id].state.get('media.caption') || 'N/A';
        break;
      case 'LABEL_NOW_PLAYING_DESCRIPTION':
        value = this.clients[device_id].state.get('media.description') || 'N/A';
        break;
    }
    debug('getTextLabelValue() Return', value);
    return value;
  }

  getSensorValue(device_id, sensor_id) {
    debug('getSensorValue', device_id, sensor_id);
    let active_player_id = null;
    switch(sensor_id) {
      case 'SWITCH_PLAYING':
        let playing = this.clients[device_id].state.get('state.isPlaying');
        return playing;
        break;
      case 'SWITCH_SHUFFLE':
        active_player_id = this.clients[device_id].state.get('state.active_player_id');
        let shuffled = this.clients[device_id].state.get('players.' + active_player_id + '.shuffled');
        debug('SHUFFLED', shuffled);
        debug(this.clients[device_id].state.players[player_id]);
        return shuffled;
        break;
      case 'SWITCH_REPEAT':
        active_player_id = this.clients[device_id].state.get('state.active_player_id');
        let repeat = this.clients[device_id].state.get('players.' + active_player_id + '.repeat');
        debug('REPEAT', repeat);
        debug(this.clients[device_id].state.players[player_id]);
        return repeat;
        break;
      case 'SWITCH_MUTE':
        let mute = this.clients[device_id].state.get('state.muted');
        return mute;
        break;
      case 'SLIDER_VOLUME':
        let volume = this.clients[device_id].state.get('state.volume');
        return volume;
        break;
    }
  }

  setSensorValue(device_id, sensor_id, value_in) {
    debug('setSensorValue', device_id, sensor_id, value_in);
    let active_player_id = null;
    let value_out = null;
    switch(sensor_id) {
      case 'SWITCH_PLAYING':
        this.clients[device_id].send('Input.ExecuteAction', { action: 'playpause' });
        break;
      case 'SWITCH_SHUFFLE':
        active_player_id = this.clients[device_id].state.get('state.active_player_id');
        value_out = value_in;
        debug('VAL', value_out);
        this.clients[device_id].send('Player.SetShuffle', {playerid: parseInt(active_player_id), shuffle: value_out});
        break;
      case 'SWITCH_REPEAT':
        active_player_id = this.clients[device_id].state.get('state.active_player_id');
        value_out = value_in == true ? 'all' : 'off';
        debug('VAL', value_out);
        this.clients[device_id].send('Player.SetRepeat', {playerid: parseInt(active_player_id), repeat: value_out});
        break;
      case 'SWITCH_MUTE':
        this.clients[device_id].send('Application.SetMute', {mute: value_in});
        return value_in;
        break;
      case 'SLIDER_VOLUME':
        this.clients[device_id].send('Application.SetVolume', {volume: parseInt(value_in)});
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
   */
  sendComponentUpdate(device_id, component_id, component_value) {
    debug('sendComponentUpdate()', device_id, component_id, component_value);
    if(Object.keys(this._componentUpdateCallbacks).length > 0) {
      // Docs say this is needed, data says otherwise
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
//          debug('NOTIFICATION_FAILED', error.message, id);
        });
      }
    }
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

};

var kodiController = new KodiController();

module.exports = kodiController;
