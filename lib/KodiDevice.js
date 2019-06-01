/*
 *	KodiDevice: Class to interface between the device and the controller.
 *	The SDK doesn't make it easy to get both a device ID and an adapter ID
 *	at the same time. The adapter ID is set by the device builder,
 *	but the device ID is kept by the brain, until an action is taken.
 *	For our purposes, we need the combination of the two.
 *
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

		this.adapter_names = {};
		this.device_ids = {};
		this.image_urls = {};
		this.text_labels = {};
		this.sensors = {};

		setInterval(() =>{ this.printState() }, 30000);
		this.printState();
	}

	registerDevice(deviceBuilder) {
		this._neeo_device = deviceBuilder;
		for(let key of ['sensors', 'sliders', 'switches', 'textLabels', 'imageUrls']) {
			for(let component of this._neeo_device[key]) {
				this._component_ids.push(component.param.name);
			}
		}
	}

	printState() {
		this.debug('KodiDevice', this.name);
		this.debug('\tAdapter names', this.adapter_names);
		this.debug('\tDevice IDs', this.device_ids);
		this.debug('\tComponent IDs', this.componentIds);
		this.debug('\tCallbacks', this._component_update_callbacks);
		this.debug('COMPONENT_IDS', this._component_ids);
	}

	onButtonPressed(button_id, device_id) {
		this.debug('onButtonPressed()', button_id, device_id);
		return controller.onButtonPressed(button_id, device_id);
	}

	getImageUrl(device_id, image_id) {
		this.debug('getImageUrl()', device_id, image_id);
		this.image_urls[image_id] = image_id;
		return controller.getImageUrl(device_id, image_id);
	}

  getTextLabel(device_id, label_id) {
		this.debug('getTextLabel()', device_id, label_id);
		this.text_labels[label_id] = label_id;
		return controller.getTextLabel(device_id, label_id);
	}

	getSensorValue(device_id, sensor_id) {
		this.debug('getSensorValue()', device_id, sensor_id);
		this.sensors[sensor_id] = sensor_id;
		let value = controller.getSensorValue(device_id, sensor_id);
		debug('\tRETURN', value);
		return value;
	}

	setSensorValue(device_id, sensor_id, value_in) {
		this.debug('setSensorValue()', device_id, sensor_id, value_in);
		this.sensors[sensor_id] = sensor_id;
		return controller.setSensorValue(device_id, sensor_id, value_in);
	}

	setNotificationCallbacks(updateCallback, optionalCallbacks, device_id) {
    this.debug('setNotificationCallbacks()', device_id);
    if(device_id) {
			controller.registerDevice(device_id, this);
      this._component_update_callbacks[device_id] = updateCallback;
    }
		this.debug('CALLBACKS', this._component_update_callbacks);
  }

  /*
   *  Currently we are sending all notifications to all callbacks and ignoring
   *  the errors.
   */
  sendComponentUpdate(device_id, component_id, component_value) {
    this.debug('sendComponentUpdate()', device_id, component_id, component_value);
		if(this._component_ids.includes(component_id)) {
			if(Object.keys(this._component_update_callbacks).length > 0) {
	      for(const [id, callback] of Object.entries(this._component_update_callbacks)) {
	        this.debug('Sending', component_id, 'update to', id);
	        callback({
	          uniqueDeviceId: device_id,
	          component: component_id,
	          value: component_value
	        }).catch((error) => {
	          this.debug('NOTIFICATION_FAILED', error.message, id);
	        }).then((result) => {
						return result;
					});
	      }
	    }
		} else {
			this.debug('This device does not have a', component_id);
			return false;
		}
  }



}
