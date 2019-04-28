'use strict';

/*
 * This should hopefully end up as a sort of template for device definitions.
 * Common stuff is defined as constants at the top.
 * Just change the controller name and finish buildDevice()
 */

const neeoapi = require('neeo-sdk');
const DummyController = require('../lib/DummyController');

const DEVICE_NAME = 'Dummy';
const DEVICE_MANUFACTURER = 'XBMC';
const DEVICE_TYPE = 'ACCESSORY';
const DRIVER_VERSION = 1;

function buildDevice() {
  let controller = new DummyController();
  let builder = neeoapi.buildDevice(DEVICE_NAME);
	builder.setManufacturer(DEVICE_MANUFACTURER)
	.setType(DEVICE_TYPE)
	.setDriverVersion(DRIVER_VERSION)
	// ------------------------------------------------------------------------ //
	.addButton({ name: 'button', label: 'Button' })
	.addButtonHandler((name, deviceId) => controller.onButtonPressed(name, deviceId))
	// ------------------------------------------------------------------------ //
  return builder;
}
const device = buildDevice();
module.exports = {
  devices: [
    device,
  ],
};
