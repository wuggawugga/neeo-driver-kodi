'use strict';

/*
 * This should hopefully end up as a sort of template for device definitions.
 * Common stuff is defined as constants at the top.
 * Just change the controller name and finish buildDevice()
 */

const neeoapi = require('neeo-sdk');
// ------------------------------------------------------------------------ //
const conf = require('../lib/Configstore');
const kodiCommands = require('../lib/kodiCommands');
const KodiController = require('../lib/KodiController');

const DEVICE_NAME = 'Kodi';
const DEVICE_MANUFACTURER = 'XBMC';
const DEVICE_TYPE = 'MUSICPLAYER';
const DRIVER_VERSION = 3;
const SEARCH_TOKENS = ['SDK', 'ppp'];
const DISCOVERY_CONFIG = {
	headerText: 'Kodi Discovery',
  description: 'Your Kodi instances will appear here',
	enableDynamicDeviceBuilder: false
};

// This is a list of keys from lib/kodiCommands to be explicitly included in the driver
const buttons = [
  'ASPECTRATIO',
  'BACKSPACE',
  'BIGSTEPBACK',
  'BIGSTEPFORWARD',
  'CHAPTERORBIGSTEPBACK',
  'CHAPTERORBIGSTEPFORWARD',
  'CLOSE',
  'CONTEXT MENU',
  'COPY',
  'CYCLESUBTITLE',
  'DECREASERATING',
  'DECREASEVISRATING',
  'DELETE',
  'ENTER',
  'FASTFORWARD',
  'FULLSCREEN',
  'GUIPROFILE',
  'HIGHLIGHT',
  'HOME',
  'INCREASERATING',
  'INCREASEVISRATING',
  'INFO',
  'LASTPAGE',
  'LOCKPRESET',
  'MOVE',
  'MOVEITEMDOWN',
  'MOVEITEMUP',
  'NEXTCHANNELGROUP',
  'NEXTPICTURE',
  'NEXTPRESET',
  'NEXTSCENE',
  'PAGEDOWN',
  'PAGEUP',
  'PARENTDIR',
  'PARENTFOLDER',
  'PLAYERDEBUG',
  'PLAYLIST',
  'PLAYPVR',
  'PLAYPVRRADIO',
  'PLAYPVRTV',
  'PREVIOUSCHANNELGROUP',
  'PREVIOUSMENU',
  'PREVIOUSPICTURE',
  'PREVIOUSPRESET',
  'PREVIOUSSCENE',
  'QUEUE',
  'RANDOMPRESET',
  'RELOADKEYMAPS',
  'RENAME',
  'REWIND',
  'SCANITEM',
  'SCREENSHOT',
  'SCROLLDOWN',
  'SCROLLUP',
  'SETRATING',
  'SHOWCODEC',
  'SHOWOSD',
  'SHOWPLAYERPROCESSINFO',
  'SHOWPRESET',
  'SHOWSUBTITLES',
  'SHOWTIME',
  'SHOWVIDEOMENU',
  'SKIPNEXT',
  'SKIPPREVIOUS',
  'SMALLSTEPBACK',
  'STEPBACK',
  'STEPFORWARD',
  'SWITCHPLAYER',
  'TOGGLEFULLSCREEN',
  'TOGGLEWATCHED',
  'ZOOMIN',
  'ZOOMOUT',
];


function buildDevice() {
	const controller = new KodiController();
	var builder = neeoapi.buildDevice(DEVICE_NAME);
	builder.setManufacturer(DEVICE_MANUFACTURER).setType(DEVICE_TYPE).setDriverVersion(DRIVER_VERSION);
	for(let key in SEARCH_TOKENS) {
    let token = SEARCH_TOKENS[key];
		builder.addAdditionalSearchToken(token)
	}
	// ------------------------------------------------------------------------ //
  // Power buttons
  builder.addButtonGroup('Power');
  // Navigation buttons
  builder.addButtonGroup('Controlpad').addButtonGroup('Menu and Back');
  // Media buttons
  builder.addButtonGroup('Volume').addButtonGroup('Language');
  builder.addButtonGroup('Transport').addButtonGroup('Transport Search').addButtonGroup('Transport Scan').addButtonGroup('Transport Skip');
  // TV/PVR buttons
  builder.addButtonGroup('Color Buttons').addButtonGroup('Numpad').addButtonGroup('Channel Zapper').addButtonGroup('Record');
  // Additional buttons
  buttons.forEach(function(item, index, array) {
//    console.log(item);
    let args = { name: item, label: kodiCommands[item].name };
//    console.log(args);
    builder.addButton(args);
  });
/*
  for (const [key, cmd] of Object.entries(kodiCommands)) {
    let args = { name: key, label: cmd.name };
    builder.addButton(args);
  }
*/

//	builder.addButton({ name: 'button-b', label: 'Button B' })
	builder.addButtonHandler((name, deviceId) => controller.onButtonPressed(name, deviceId))
	.registerInitialiseFunction(() => controller.initialise())
	.enableDiscovery(DISCOVERY_CONFIG, () => controller.discoverDevices())
	// ------------------------------------------------------------------------ //
	return builder;
}

const device = buildDevice();

module.exports = {
  devices: [device],
};
