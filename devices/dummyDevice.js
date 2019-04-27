'use strict';

/*
 * This should hopefully end up as a sort of template for device definitions.
 * Common stuff is defined as constants at the top.
 * Just change the controller name and finish buildDevice()
 */

const neeoapi = require('neeo-sdk');

const DEVICE_NAME = 'Kodi';
const DEVICE_MANUFACTURER = 'XBMC';
const DEVICE_TYPE = 'ACCESSORY';
const DRIVER_VERSION = 1;
const SEARCH_TOKENS = ['SDK'];

const controller = require('../lib/DummyController');

function buildDevice() {
	return neeoapi.buildDevice(DEVICE_NAME)
	.setManufacturer(DEVICE_MANUFACTURER)
	.setType(DEVICE_TYPE)
	.setDriverVersion(DRIVER_VERSION)
	.addAdditionalSearchToken('SDK')
	// ------------------------------------------------------------------------ //
	.addButton({ name: 'button', label: 'Button' })
	.addButtonHandler((name, deviceId) => controller.onButtonPressed(name, deviceId))
	// ------------------------------------------------------------------------ //
}
const device = buildDevice();
module.exports = { device };
