'use strict';

/*
 * This should hopefully end up as a sort of template for device definitions.
 * Common stuff is defined as constants at the top.
 * Just change the controller name and finish buildDevice()
 */

const neeoapi = require('neeo-sdk');
// ------------------------------------------------------------------------ //
const conf = require('../lib/Configstore');
const debug = require('debug')('neeo-driver-kodi:kodiDevice');
const kodiCommands = require('../lib/kodiCommands');
const KodiController = require('../lib/KodiController');

const DEVICE_NAME = 'Kodi';
const DEVICE_MANUFACTURER = 'XBMC';
const DEVICE_TYPE = 'MUSICPLAYER';
const DRIVER_VERSION = 7;
const SEARCH_TOKENS = ['SDK', 'ppp'];
const DISCOVERY_CONFIG = {
	headerText: 'Kodi Discovery',
  description: 'Your Kodi instances will appear here',
	enableDynamicDeviceBuilder: false
};

function buildDevice() {
	const controller = new KodiController();
	var builder = neeoapi.buildDevice(DEVICE_NAME);
	builder.setManufacturer(DEVICE_MANUFACTURER).setType(DEVICE_TYPE).setDriverVersion(DRIVER_VERSION);
	for(let key in SEARCH_TOKENS) {
    let token = SEARCH_TOKENS[key];
		builder.addAdditionalSearchToken(token)
	}
	// ------------------------------------------------------------------------ //
  // Button groups
  builder.addButtonGroup('Power')
	.addButtonGroup('Controlpad')
	.addButtonGroup('Menu and Back')
  .addButtonGroup('Volume')
	.addButtonGroup('Language')
  .addButtonGroup('Transport')
	.addButtonGroup('Transport Search')
	.addButtonGroup('Transport Scan')
	.addButtonGroup('Transport Skip')
	.addButtonGroup('Color Buttons')
	.addButtonGroup('Numpad')
	.addButtonGroup('Channel Zapper')
	.addButtonGroup('Record');
  // Additional buttons
  kodiCommands.buttons.forEach(function(item, index, array) {
		if(kodiCommands.commands[item]) {
			let args = { name: item, label: kodiCommands.commands[item].name };
	    builder.addButton(args);
		} else {
			debug('Button', item, 'missing');
		}
  });
	builder.addButtonHandler((name, deviceId) => controller.onButtonPressed(name, deviceId))

	// Directories
	builder.addDirectory({ name: 'LIBRARY', label: 'Library', role: 'ROOT' }, {
		getter: (deviceId, params, directory) => controller.browse(deviceId, params, 'root'),
		action: (deviceId, params, directory) => controller.listAction(deviceId, params, 'root')
	});

	builder.addDirectory({ name: 'QUEUE', label: 'Queue', role: 'QUEUE' }, {
		getter: (deviceId, params, directory) => controller.browse(deviceId, params, 'queue'),
		action: (deviceId, params, directory) => controller.listAction(deviceId, params, 'queue')
	});

	builder.registerInitialiseFunction(() => controller.initialise());
	builder.enableDiscovery(DISCOVERY_CONFIG, () => controller.discoverDevices());
	// ------------------------------------------------------------------------ //
	return builder;
}

const device = buildDevice();

module.exports = {
  devices: [device],
};
