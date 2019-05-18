'use strict';

/*
 * This should hopefully end up as a sort of template for device definitions.
 * Common stuff is defined as constants at the top.
 * Just change the controller name and finish buildDevice()
 */

const neeoapi = require('neeo-sdk');
// ------------------------------------------------------------------------ //
//const conf = require('../lib/Config');
const debug = require('debug')('neeo-driver-kodi:kodiDevice');
const kodiCommands = require('../lib/kodiCommands');
const controller = require('../lib/KodiController');

const DEVICE_NAME = 'Kodi';
const DEVICE_MANUFACTURER = 'XBMC';
// FIXME: MUSICPLAYER lets me skip cabling in NEEO
const DEVICE_TYPE = 'MUSICPLAYER';
const DRIVER_VERSION = 27;
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

	var builder = neeoapi.buildDevice(DEVICE_NAME);

	builder.setManufacturer(DEVICE_MANUFACTURER).setType(DEVICE_TYPE).setDriverVersion(DRIVER_VERSION);
	for(let key in SEARCH_TOKENS) {
    let token = SEARCH_TOKENS[key];
		builder.addAdditionalSearchToken(token)
	}
	// ------------------------------------------------------------------------ //

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
	builder.addDirectory({ name: 'DIRECTORY_ROOT', label: 'Library', role: 'ROOT' }, {
		getter: (deviceId, params, directory) => controller.browseDirectory(deviceId, 'DIRECTORY_ROOT', params),
		action: (deviceId, params, directory) => controller.listAction(deviceId, 'DIRECTORY_ROOT', params)
	});
	builder.addDirectory({ name: 'DIRECTORY_QUEUE', label: 'Queue', role: 'QUEUE' }, {
		getter: (deviceId, params, directory) => controller.browseDirectory(deviceId, 'DIRECTORY_QUEUE', params),
		action: (deviceId, params, directory) => controller.listAction(deviceId, 'DIRECTORY_QUEUE', params)
	});
	builder.addDirectory({ name: 'DIRECTORY_LIBRARY_AUDIO', label: 'Music Library' }, {
		getter: (deviceId, params, directory) => controller.browseDirectory(deviceId, 'DIRECTORY_LIBRARY_AUDIO', params),
		action: (deviceId, params, directory) => controller.listAction(deviceId, 'DIRECTORY_LIBRARY_AUDIO', params)
	});
	builder.addDirectory({ name: 'DIRECTORY_LIBRARY_VIDEO', label: 'Video Library' }, {
		getter: (deviceId, params, directory) => controller.browseDirectory(deviceId, 'DIRECTORY_LIBRARY_VIDEO', params),
		action: (deviceId, params, directory) => controller.listAction(deviceId, 'DIRECTORY_LIBRARY_VIDEO', params)
	});
	builder.addDirectory({ name: 'DIRECTORY_FAVOURITES', label: 'Favourites' }, {
		getter: (deviceId, params, directory) => controller.browseDirectory(deviceId, 'DIRECTORY_FAVOURITES', params),
		action: (deviceId, params, directory) => controller.listAction(deviceId, 'DIRECTORY_FAVOURITES', params)
	});
	builder.addDirectory({ name: 'DIRECTORY_NOW_PLAYING', label: 'Media Info' }, {
		getter: (deviceId, params, directory) => controller.browseDirectory(deviceId, 'DIRECTORY_NOW_PLAYING', params),
		action: (deviceId, params, directory) => controller.listAction(deviceId, 'DIRECTORY_NOW_PLAYING', params)
	});
/*
	builder.addDirectory({ name: 'DIRECTORY_NOW_PLAYING_ARTWORK', label: 'Artwork' }, {
		getter: (deviceId, params, directory) => controller.browseDirectory(deviceId, params, 'DIRECTORY_NOW_PLAYING_ARTWORK'),
		action: (deviceId, params, directory) => controller.listAction(deviceId, params, 'DIRECTORY_NOW_PLAYING_ARTWORK')
	});
*/



	builder.addSlider({ name: 'SLIDER_VOLUME', label: 'Volume', range: [0, 100], unit: '%' }, { setter: (device_id, value) => controller.setSensorValue(device_id, 'SLIDER_VOLUME', value), getter: (device_id) => controller.getSensorValue(device_id, 'SLIDER_VOLUME') });
	builder.addSwitch({ name: 'SWITCH_MUTE', label: 'Mute' }, { setter: (device_id, value) => controller.setSensorValue(device_id, 'SWITCH_MUTE', value), getter: (device_id) => controller.getSensorValue(device_id, 'SWITCH_MUTE') });
	// builder.addSwitch({ name: 'SWITCH_PLAYING', label: 'Playing' }, { setter: (device_id, value) => controller.setSensorValue(device_id, 'SWITCH_PLAYING', value), getter: (device_id) => controller.getSensorValue(device_id, 'SWITCH_PLAYING') });
	// builder.addSwitch({ name: 'SWITCH_SHUFFLE', label: 'Shuffle' }, { setter: (device_id, value) => controller.setSensorValue(device_id, 'SWITCH_SHUFFLE', value), getter: (device_id) => controller.getSensorValue(device_id, 'SWITCH_SHUFFLE') });
	// builder.addSwitch({ name: 'SWITCH_REPEAT', label: 'Repeat' }, { setter: (device_id, value) => controller.setSensorValue(device_id, 'SWITCH_REPEAT', value), getter: (device_id) => controller.getSensorValue(device_id, 'SWITCH_REPEAT') });

	builder.addTextLabel({ name: 'LABEL_NOW_PLAYING_CAPTION', label: 'Now Playing Title', isLabelVisible: false }, (device_id) => controller.getTextLabel(device_id, 'LABEL_NOW_PLAYING_CAPTION') );
	builder.addTextLabel({ name: 'LABEL_NOW_PLAYING_DESCRIPTION', label: 'Now Playing Description', isLabelVisible: false }, (device_id) => controller.getTextLabel(device_id, 'LABEL_NOW_PLAYING_DESCRIPTION') );

	builder.addImageUrl({ name: 'IMAGE_NOW_PLAYING_THUMBNAIL_LARGE', label: 'Now Playing Thumbnail Large', size: 'large' }, (device_id) => controller.getImageUrl(device_id, 'IMAGE_NOW_PLAYING_THUMBNAIL_LARGE'));
	builder.addImageUrl({ name: 'IMAGE_NOW_PLAYING_THUMBNAIL_SMALL', label: 'Now Playing Thumbnail Small', size: 'small' }, (device_id) => controller.getImageUrl(device_id, 'IMAGE_NOW_PLAYING_THUMBNAIL_SMALL'));

	builder.registerSubscriptionFunction((updateCallback, optionalCallbacks) => controller.setNotificationCallbacks(updateCallback, optionalCallbacks, builder.deviceidentifier) );
	builder.registerInitialiseFunction(() => controller.initialise(builder.deviceidentifier));
	builder.enableRegistration(REGISTRATION_CONFIG, { register: (credentials) => controller.register(credentials), isRegistered: (foo, bar) => controller.isRegistered(foo, bar) } );
	builder.enableDiscovery(DISCOVERY_CONFIG, () => controller.discoverDevices());
	// ------------------------------------------------------------------------ //
	return builder;
}

const device = buildDevice();

module.exports = {
  devices: [device],
};
