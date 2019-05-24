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

const DEVICE_NAME = 'Kodi Player';
const DEVICE_MANUFACTURER = 'XBMC';
// FIXME: MUSICPLAYER lets me skip cabling in NEEO
const DEVICE_TYPE = 'MUSICPLAYER';
const DRIVER_VERSION = 2;
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

	builder.addPlayerWidget({
	  rootDirectory: {
	    name: 'DIRECTORY_ROOT', // Optional: will default to ROOT_DIRECTORY
//	    label: 'My Library', // Optional: will default to ROOT
	    controller: {
				getter: (deviceId, params, directory) => controller.browseDirectory(deviceId, 'DIRECTORY_ROOT', params),
				action: (deviceId, params, directory) => controller.listAction(deviceId, 'DIRECTORY_ROOT', params)
			},
	  },
	  // Optional:
	  queueDirectory: {
	    name: 'DIRECTORY_QUEUE', // Optional: will default to QUEUE_DIRECTORY
//	    label: 'Queue', // Optional: will default to QUEUE
	    controller: {
				getter: (deviceId, params, directory) => controller.browseDirectory(deviceId, 'DIRECTORY_QUEUE', params),
				action: (deviceId, params, directory) => controller.listAction(deviceId, 'DIRECTORY_QUEUE', params)
			},
	  },
	  volumeController: {setter: (device_id, value) => controller.setSensorValue(device_id, 'SLIDER_VOLUME', value), getter: (device_id) => controller.getSensorValue(device_id, 'SLIDER_VOLUME')},
	  coverArtController: { getter: (device_id) => controller.getImageUrl(device_id, 'IMAGE_NOW_PLAYING_THUMBNAIL_LARGE') },
	  titleController: { getter: (device_id) => controller.getTextLabel(device_id, 'LABEL_NOW_PLAYING_CAPTION') },
	  descriptionController: { getter: (device_id) => controller.getTextLabel(device_id, 'LABEL_NOW_PLAYING_DESCRIPTION') },
	  playingController: { setter: (device_id, value) => controller.setSensorValue(device_id, 'SWITCH_PLAYING', value), getter: (device_id) => controller.getSensorValue(device_id, 'SWITCH_PLAYING') },
	  muteController: { setter: (device_id, value) => controller.setSensorValue(device_id, 'SWITCH_MUTE', value), getter: (device_id) => controller.getSensorValue(device_id, 'SWITCH_MUTE') },
	  shuffleController: { setter: (device_id, value) => controller.setSensorValue(device_id, 'SWITCH_SHUFFLE', value), getter: (device_id) => controller.getSensorValue(device_id, 'SWITCH_SHUFFLE') },
	  repeatController: { setter: (device_id, value) => controller.setSensorValue(device_id, 'SWITCH_REPEAT', value), getter: (device_id) => controller.getSensorValue(device_id, 'SWITCH_REPEAT') },
	});
	builder.addButtonHandler((name, deviceId) => controller.onButtonPressed(name, deviceId));

	builder.registerSubscriptionFunction((updateCallback, optionalCallbacks) => controller.setNotificationCallbacks(updateCallback, optionalCallbacks, builder.deviceidentifier) );
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
