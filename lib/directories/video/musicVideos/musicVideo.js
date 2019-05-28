'use strict';

const BluePromise = require('bluebird');
const neeoapi = require('neeo-sdk');
const conf = require('../../../Config');
const debug = require('debug')('neeo-driver-kodi:musicVideo');

module.exports = function Directory(browser) {
	this.browser = browser;
	this.library = this.browser.library;
	this.name = 'musicVideo';
	this.title = 'Music Video Details';
	this.path = '/video/musicvideo/:music_video_id';
	this.thumbnail_widths = conf.get('thumbnail_widths');

	this.list = function(route_in, params_in) {
		return new BluePromise((resolve, reject) => {
			let music_video_id = parseInt(route_in[1]);
			debug('MVID', music_video_id);
			// FIXME: Use KodiLibrary because of reasons
			let params_out = { musicvideoid: parseInt(music_video_id), properties: ["title", "playcount", "runtime", "director", "studio", "year", "plot", "album", "artist", "genre", "track", "streamdetails", "lastplayed", "fanart", "thumbnail", "file", "resume", "dateadded", "tag", "art", "rating", "userrating", "premiered"] };
			this.browser.client.send('VideoLibrary.getMusicVideoDetails', params_out).then((response) => {
				var music_video = response.musicvideodetails;

				const list_options = {
					title: 'Music Video Details',
					totalMatchingItems: 1,
					browseIdentifier: route_in[0],
				};
				let list_out = neeoapi.buildBrowseList(list_options);
				list_out.setListTitle(list_options.title);

				if(music_video.title) list_out.addListHeader(music_video.artist.join(', '));
				var item_out = {
					title: music_video.title,
					label: ''
				};
				if(music_video.runtime) {
					item_out.title += ' [' + Math.floor(music_video.runtime/60) + ':' + (music_video.runtime % 60).toString().padStart(2, '0') + ']';
				}
				if(music_video.album) {
					item_out.label += music_video.album;
					if(music_video.year) item_out.label += ' (' + music_video.year + ')';
				}
				if(music_video.thumbnail) item_out.thumbnailUri = this.browser.client.getKodiImage(music_video.thumbnail, this.thumbnail_widths.tile);
				list_out.addListItem(item_out);

				if(music_video.genre) list_out.addListItem({title: music_video.genre.join(', ')});

				if(music_video.plot) {
					item_out = {
						title: 'Production Info',
						text: music_video.plot,
						affirmativeButtonText: 'Close'
					};
					list_out.addListInfoItem(item_out);
				}

				let list_buttons = [
					{title: 'Play', actionIdentifier: 'Internal/playMusicVideo/' + music_video_id, uiAction: 'close' },
					{title: 'Queue', actionIdentifier: 'Internal/queueMusicVideo/' + music_video_id, uiAction: 'close' },
				];
				list_out.addListButtons(list_buttons);
				list_buttons = [
					{ iconName: 'Repeat', actionIdentifier: 'VideoPlayer/cycleRepeat' },
					{ iconName: 'Shuffle', actionIdentifier: 'VideoPlayer/toggleShuffle' }
				];
				list_out.addListButtons(list_buttons);

				resolve(list_out);
			});
		});
	}
}
