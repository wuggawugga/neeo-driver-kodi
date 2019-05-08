'use strict';

/*
 * This should hopefully end up as a sort of template for device definitions.
 * Common stuff is defined as constants at the top.
 * Just change the controller name and finish buildDevice()
 */

const neeoapi = require('neeo-sdk');
// ------------------------------------------------------------------------ //
//const conf = require('../lib/Configstore');
const debug = require('debug')('neeo-driver-kodi:kodiDevice');
const kodiCommands = require('../lib/kodiCommands');
const KodiController = require('../lib/KodiController');

const DEVICE_NAME = 'Kodi';
const DEVICE_MANUFACTURER = 'XBMC';
// FIXME: MUSICPLAYER lets me skip cabling in NEEO
const DEVICE_TYPE = 'MUSICPLAYER';
const DRIVER_VERSION = 16;
// FIXME: ppp is just easy to type on android keyboard
const SEARCH_TOKENS = ['SDK', 'ppp'];
const DISCOVERY_CONFIG = {
	headerText: 'Kodi Discovery',
  description: 'Your Kodi instances will appear here',
	enableDynamicDeviceBuilder: false
};
const REGISTRATION_CONFIG = {
	type: 'ACCOUNT',
	headerText: 'Device Registration',
	description: 'Please enter the credentials for your Kodi instance. If your instance does not use authentication, just enter random values.',
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
	//builder.addPlayerWidget(controller)
  // Button groups
  kodiCommands.button_groups.forEach(function(item, index, array) {
		builder.addButtonGroup(item);
	});
  // Additional buttons
  kodiCommands.buttons.forEach(function(item, index, array) {
		if(kodiCommands.commands[item]) {
			let args = { name: item, label: kodiCommands.commands[item].name };
	    builder.addButton(args);
		} else {
			debug('Button', item, 'missing');
		}
  });
	builder.addButtonHandler((name, deviceId) => controller.onButtonPressed(name, deviceId));

	// Directories
	builder.addDirectory({ name: 'DIRECTORY_LIBRARY', label: 'Library', role: 'ROOT' }, {
		getter: (deviceId, params, directory) => controller.browseDirectory(deviceId, params, 'DIRECTORY_LIBRARY'),
		action: (deviceId, params, directory) => controller.listAction(deviceId, params, 'DIRECTORY_LIBRARY')
	});
	builder.addDirectory({ name: 'DIRECTORY_QUEUE', label: 'Queue', role: 'QUEUE' }, {
		getter: (deviceId, params, directory) => controller.browseDirectory(deviceId, params, 'DIRECTORY_QUEUE'),
		action: (deviceId, params, directory) => controller.listAction(deviceId, params, 'DIRECTORY_QUEUE')
	});
/*
	builder.addDirectory({ name: 'DIRECTORY_NOWPLAYING_ARTWORK', label: 'Artwork' }, {
		getter: (deviceId, params, directory) => controller.browseDirectory(deviceId, params, 'DIRECTORY_NOWPLAYING_ARTWORK'),
		action: (deviceId, params, directory) => controller.listAction(deviceId, params, 'DIRECTORY_NOWPLAYING_ARTWORK')
	});
*/	
	// Sensors
	// builder.addSensor({ name: 'SENSOR_TITLE', type: 'string' }, { getter: (deviceId, foo) => controller.sensorValue });
  // builder.addSensor({ name: 'SENSOR_DESCRIPTION', type: 'string' }, { getter: (deviceId, foo) => controller.sensorValue });
	//
	builder.addTextLabel({ name: 'LABEL_NOWPLAYING_CAPTION', label: 'Now Playing Title', isLabelVisible: false }, (device_id) => controller.getTextLabel(device_id, 'LABEL_NOWPLAYING_CAPTION') );
	builder.addTextLabel({ name: 'LABEL_NOWPLAYING_DESCRIPTION', label: 'Now Playing Description', isLabelVisible: false }, (device_id) => controller.getTextLabel(device_id, 'LABEL_NOWPLAYING_DESCRIPTION') );

	builder.addImageUrl({ name: 'IMAGE_NOWPLAYING_THUMBNAIL_LARGE', label: 'Now Playing Thumbnail Large', size: 'large' }, (device_id) => controller.getImageUrl(device_id, 'IMAGE_NOWPLAYING_THUMBNAIL_LARGE'));
	builder.addImageUrl({ name: 'IMAGE_NOWPLAYING_THUMBNAIL_SMALL', label: 'Now Playing Thumbnail Small', size: 'small' }, (device_id) => controller.getImageUrl(device_id, 'IMAGE_NOWPLAYING_THUMBNAIL_SMALL'));

	builder.registerSubscriptionFunction((updateCallback, optionalCallbacks) => controller.setNotificationCallbacks(updateCallback, optionalCallbacks));
	builder.registerInitialiseFunction(() => controller.initialise());
	builder.enableRegistration(REGISTRATION_CONFIG, { register: (credentials) => controller.register(credentials), isRegistered: (foo, bar) => controller.isRegistered(foo, bar) } );
	builder.enableDiscovery(DISCOVERY_CONFIG, () => controller.discoverDevices());
	// ------------------------------------------------------------------------ //
	return builder;
}

const device = buildDevice();

module.exports = {
  devices: [device],
};
