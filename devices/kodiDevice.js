'use strict';

/*
 * This should hopefully end up as a sort of template for device definitions.
 * Common stuff is defined as constants at the top.
 * Just change the controller name and finish buildDevice()
 */

const neeoapi = require('neeo-sdk');
const conf = require('../lib/Configstore');
const kodiCommands = require('../lib/kodiCommands');
const KodiController = require('../lib/KodiController');

const DEVICE_NAME = 'Kodi';
const DEVICE_MANUFACTURER = 'XBMC';
const DEVICE_TYPE = 'MUSICPLAYER';
const DRIVER_VERSION = 1;
const SEARCH_TOKENS = ['SDK', 'ppp'];
const REGISTRATION_CONFIG = {
  type: 'ACCOUNT',
  headerText: 'Registration header text',
  description: 'Registration description'
};
const DISCOVERY_CONFIG = {
	headerText: 'Discovery header text',
  description: 'Discovery Description',
	enableDynamicDeviceBuilder: false
};

var kodi_devices = [];
for (let id in conf.all) {
	let device = buildDevice(conf.get(id));
	kodi_devices.push(device);
}

//console.log(kodiCommands);

function buildDevice(service) {
	console.log('- Building device:', service.name);
	const controller = new KodiController(service);
	var builder = neeoapi.buildDevice('Kodi ' + service.name);
	builder.setManufacturer(DEVICE_MANUFACTURER).setType(DEVICE_TYPE).setDriverVersion(DRIVER_VERSION);
	for(let key in SEARCH_TOKENS) {
    let token = SEARCH_TOKENS[key];
		builder.addAdditionalSearchToken(token)
	}
	// ------------------------------------------------------------------------ //

  for (const [key, cmd] of Object.entries(kodiCommands)) {
    let args = { name: key, label: cmd.name };
    builder.addButton(args);
  }

//	builder.addButton({ name: 'button-b', label: 'Button B' })
	builder.addButtonHandler((name, deviceId) => controller.onButtonPressed(name, deviceId))
	.registerInitialiseFunction(() => controller.initialise())
	.enableDiscovery(DISCOVERY_CONFIG, () => controller.discoverDevices())
	// ------------------------------------------------------------------------ //
	return builder;
}

module.exports = {
  devices: kodi_devices,
};
