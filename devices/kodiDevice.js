'use strict';

/*
 * This should hopefully end up as a sort of template for device definitions.
 * Common stuff is defined as constants at the top.
 * Just change the controller name and finish buildDevice()
 */

const neeoapi = require('neeo-sdk');

const DEVICE_NAME = 'Kodi';
const DEVICE_MANUFACTURER = 'XBMC';
const DEVICE_TYPE = 'MUSICPLAYER';
const DRIVER_VERSION = 1;
const SEARCH_TOKENS = ['SDK', 'ppp'];

const DISCOVERY_CONFIG = {
  headerText: "NEEO will discover Kodi.",
  description: 'Make sure to enable: "Announce services to other systems"\r\n"Allow remote control via HTTP" and\r\n"Allow remote control from applications on other systems".\r\n\r\nPres Next to continue.',
	enableDynamicDeviceBuilder: false
};
const REGISTRATION_CONFIG = {
  type: 'ACCOUNT',
  headerText: 'Header text',
  description: 'Description'
};

const KodiController = require('../lib/KodiController');
//const controller = KodiController.build();
const controller = new KodiController();


function buildDevice() {
	console.log('buildDevice');
	return neeoapi.buildDevice(DEVICE_NAME)
	.setManufacturer(DEVICE_MANUFACTURER)
	.setType(DEVICE_TYPE)
//	.setDriverVersion(DRIVER_VERSION)
	.addAdditionalSearchToken('SDK')
	// ------------------------------------------------------------------------ //
	.addButton({ name: 'button-b', label: 'Button B' })
	.addButtonHandler((name, deviceId) => controller.onButtonPressed(name, deviceId))
	.registerInitialiseFunction(controller.initialise)
	.enableDiscovery(DISCOVERY_CONFIG, controller.discover)
	.enableRegistration(REGISTRATION_CONFIG, { register: controller.register, isRegistered: controller.isRegistered })
	// ------------------------------------------------------------------------ //
}
const device = buildDevice();
module.exports = { device };
