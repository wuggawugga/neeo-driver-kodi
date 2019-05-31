/*
 *	Button translations for different windows
 *	https://github.com/xbmc/xbmc/blob/master/system/keymaps/remote.xml
 * 	https://github.com/xbmc/xbmc/blob/master/system/keymaps/
 *	https://kodi.wiki/view/Window_IDs
 *
 *	Example: Left and right cursor keys causes video step when in fullscreen video player
 *		'12005': {
 *			'CURSOR LEFT': 'STEPBACK',
 *			'CURSOR RIGHT': 'STEPFORWARD',
 *
 */

'use strict';

const debug = require('debug')('neeo-driver-kodi:kodiKeymap');
const window_ids = require('./WindowIDs');


// The keymap overrides the normal mapping when certain Kodi windows are active
// i.e. the default mapping defined in kodiCommands.commands correspond to the "global"
// section in the original XML keymap.
const keymap = {
	WINDOW_FULLSCREEN_VIDEO: {
		'CURSOR UP': 'CMD_CHAPTERORBIGSTEPFORWARD',
		'CURSOR DOWN': 'CMD_CHAPTERORBIGSTEPBACK',
		'CURSOR LEFT': 'CMD_STEPBACK',
		'CURSOR RIGHT': 'CMD_STEPFORWARD',
		'CURSOR ENTER': 'CMD_SHOWOSD',
		'CMD_UP': 'CMD_CHAPTERORBIGSTEPFORWARD',
		'CMD_DOWN': 'CMD_CHAPTERORBIGSTEPBACK',
		'CMD_LEFT': 'CMD_STEPBACK',
		'CMD_RIGHT': 'CMD_STEPFORWARD',
		'CMD_SELECT': 'CMD_SHOWOSD',
  },
	WINDOW_FULLSCREEN_GAME: {
		'CURSOR LEFT': 'CMD_STEPBACK',
		'CURSOR RIGHT': 'CMD_STEPFORWARD',
		'CMD_LEFT': 'CMD_STEPBACK',
		'CMD_RIGHT': 'CMD_STEPFORWARD',
  },
	WINDOW_VISUALISATION: {
		'CURSOR UP': 'CMD_SKIPNEXT',
		'CURSOR DOWN': 'CMD_SKIPPREVIOUS',
		'CURSOR LEFT': 'CMD_STEPBACK',
		'CURSOR RIGHT': 'CMD_STEPFORWARD',
		'CMD_UP': 'CMD_SKIPNEXT',
		'CMD_DOWN': 'CMD_SKIPPREVIOUS',
		'CMD_LEFT': 'CMD_STEPBACK',
		'CMD_RIGHT': 'CMD_STEPFORWARD',
  },
	WINDOW_FULLSCREEN_LIVETV: {
		'CURSOR LEFT': 'CMD_STEPBACK',
		'CURSOR RIGHT': 'CMD_STEPFORWARD',
		'CMD_LEFT': 'CMD_STEPBACK',
		'CMD_RIGHT': 'CMD_STEPFORWARD',
  },
	WINDOW_FULLSCREEN_RADIO: {
		'CURSOR LEFT': 'CMD_STEPBACK',
		'CURSOR RIGHT': 'CMD_STEPFORWARD',
		'CMD_LEFT': 'CMD_STEPBACK',
		'CMD_RIGHT': 'CMD_STEPFORWARD',
  }
};

function map(command_in, window_in) {
	debug('map()');
	debug('IN', command_in, window_in);
	let command = command_in;
	let window = window_in;
	if(window_ids[window_in]) {
		window = window_ids[window_in].id;
		if(keymap[window]) {
			if(keymap[window][command_in]) {
				command = keymap[window][command_in];
			}
		}
	}
	debug('OUT', command, window);
	return command;
}

module.exports = { keymap, map };
