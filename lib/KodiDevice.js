/*
 *	KodiDevice: Class to interface between the device and the controller.
 *	Using multiple devices with multiple Kodi instances on a single controller
 *	can get messy.
 */

'use strict';

const debug = require('debug')('neeo-driver-kodi:KodiDevice');
const controller = require('../lib/KodiController');

module.exports = class KodiDevice {

	constructor(name) {
		this.name = name;
		this.debug = debug.extend(this.name);
		this.debugData = this.debug.extend('data');
		this.rand = Math.random() * 10;
		this.debug('CONSTRUCTOR', name, this.rand);
		this._neeo_device = null;
		this._component_update_callbacks = {};
		this._component_ids = [];
		this._kodi_ids = {};

		// setInterval(() =>{ this.printState() }, 30000);
		// this.printState();
	}

	registerDevice(deviceBuilder) {
		this.debug('registerDevice()');
		try {
			this._neeo_device = deviceBuilder;
			for(let key of ['sensors', 'sliders', 'switches', 'textLabels', 'imageUrls']) {
				for(let component of this._neeo_device[key]) {
					this._component_ids.push(component.param.name);
				}
			}
		} catch(e) {
			this.debug('Caught', e);
		}
	}

	printDevice() {
		for(let key of ['sensors', 'sliders', 'switches', 'textLabels', 'imageUrls']) {
			for(let component of this._neeo_device[key]) {
				this.debug('\t', component.param.name);
			}
		}
	}

	hasKodiInstance(device_id) {
		let result = Object.values(this._kodi_ids).includes(device_id);
		this.debug('hasKodiInstance()', device_id, ':', result);
		return result;
	}

	printState() {
		this.debug('KodiDevice', this.name);
		this.debug('\tKodi IDs', this._kodi_ids);
		this.debug('\tComponent IDs', this._component_ids);
		this.debug('\tCallbacks', this._component_update_callbacks);
	}

	onButtonPressed(button_id, device_id) {
		this.debug('onButtonPressed()', button_id, device_id);
		this._kodi_ids[device_id] = device_id;
		return controller.onButtonPressed(button_id, device_id);
	}

	getImageUrl(device_id, image_id) {
		this.debug('getImageUrl()', device_id, image_id);
		this._kodi_ids[device_id] = device_id;
		return controller.getImageUrl(device_id, image_id);
	}

  getTextLabel(device_id, label_id) {
		this.debug('getTextLabel()', device_id, label_id);
		this._kodi_ids[device_id] = device_id;
		return controller.getTextLabel(device_id, label_id);
	}

	getSensorValue(device_id, sensor_id) {
		this.debug('getSensorValue()', device_id, sensor_id);
		this._kodi_ids[device_id] = device_id;
		let value = controller.getSensorValue(device_id, sensor_id);
		debug('\tRETURN', value);
		return value;
	}

	setSensorValue(device_id, sensor_id, value_in) {
		this.debug('setSensorValue()', device_id, sensor_id, value_in);
		this._kodi_ids[device_id] = device_id;
		return controller.setSensorValue(device_id, sensor_id, value_in);
	}

	setNotificationCallbacks(updateCallback, optionalCallbacks, device_id) {
    this.debug('setNotificationCallbacks()', device_id);
    if(device_id) {
			// There can be only one!
			if(Object.keys(this._component_update_callbacks).length && !this._component_update_callbacks[device_id]) {
				debug('WTF?!');
				process.exit(-1);
			}
			controller.registerDevice(device_id, this);
      this._component_update_callbacks[device_id] = updateCallback;
    }
		this.debug('CALLBACKS', this._component_update_callbacks);
  }

  sendComponentUpdate(device_id, component_id, component_value) {
    this.debug('sendComponentUpdate()', device_id, component_id, component_value);
		if(this._component_ids.includes(component_id)) {
			if(Object.keys(this._component_update_callbacks).length > 0) {
	      for(const [id, callback] of Object.entries(this._component_update_callbacks)) {
	        this.debug('Sending', component_id);
	        callback({
	          uniqueDeviceId: device_id,
	          component: component_id,
	          value: component_value
	        }).catch((error) => {
	          this.debug('NOTIFICATION_FAILED', error.message, id);
						this.printDevice();
	        }).then((result) => {
						return result;
					});
	      }
	    }
		} else {
			debug('ME NO HAVE', component_id);
			return false;
		}
  }



}
