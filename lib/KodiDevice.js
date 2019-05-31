/*
 *	KodiDevice: Class to interface between the device and the controller.
 *	The SDK doesn't always provide a lot of information to distinguish
 *	between different device objects when dealing with things such as
 *	registration and component updates.
 */

'use strict';

const debug = require('debug')('neeo-driver-kodi:KodiDevice');
const controller = require('../lib/KodiController');

module.exports = class KodiDevice {

	constructor(id) {
		this.id = id;
		this.debug = debug.extend(this.id);
		this.debugData = this.debug.extend('data');
		this.debug('CONSTRUCTOR', id);


		this.rand = Math.random() * 10;
		this._componentUpdateCallbacks = {};

		this.debug(this);
	}

	toString() {
		return ['KodiDevice', this.rand].join(' ');
	}


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
          debug('NOTIFICATION_FAILED', error.message, id);
        });
      }
    }
  }



}
