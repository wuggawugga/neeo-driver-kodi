'use strict';

const BluePromise = require('bluebird');
const neeoapi = require('neeo-sdk');
const debug = require('debug')('neeo-driver-kodi:foo');
const conf = require('../Config');

module.exports = function Directory(browser) {
	this.browser = browser;
	this.library = this.browser.library;
	this.name = 'queue';
	this.title = 'Current playlist';
	this.path = '/queue';
	this.thumbnail_widths = conf.get('thumbnail_widths');

	this.list = function(route_in, params_in) {
		// Caveat: This is assuming that all playlist items are the same media type
		debug('getQueue()', params_in);
		var s = this.browser.client.state;
		var media_type = s.get('media.type');
		var media_item_type = s.get('media.item.type');
		s.updatePlayer();
		s.updatePlaylists();

		var params = {
			playlist_id: undefined,
			properties: undefined,
			limits: {
				start: params_in.start,
				end: params_in.end,
			}
		};
		var listOptions = {
			title: 'Current Playlist',
			offset: params_in.offset,
			limit: params_in.limit
		};
//		list.setListTitle(listOptions.title);
		debug('TYPE', media_type, media_item_type);
		return new BluePromise((resolve, reject) => {
			var list = neeoapi.buildBrowseList(listOptions);
			// Music tracks
			if(media_item_type == 'song') {
				params.playlistid = 0;
				params.properties = ["uniqueid", "thumbnail", "userrating", "duration", "artist", "artistid", "album", "albumid", "albumartist", "albumartistid", "albumlabel", "sorttitle", "title", "genre", "genreid", "track", "disc", "tag", "displayartist", "description"];
				this.browser.client.send('Playlist.GetItems', params)
				.then((response) => {
					list.setTotalMatchingItems(response.limits.total);
					if(params_in.offset == 0) {
						list.addListHeader(response.limits.total + ' Tracks');
					}
					var index = params_in.offset;
					for(var item of response.items) {
						var params_item = {
							title: item.title,
							label: item.label,
							thumbnailUri: this.browser.client.getKodiImage(item.thumbnail, 215),
							actionIdentifier: 'Internal/goToPlaylistItem/0/' + index++
						};
						list.addListItem(params_item);
					}
					resolve(list);
				});
			}
			// TV episodes
			if(media_item_type == 'episode') {
				params.playlistid = 1;
				params.properties = ["uniqueid", "thumbnail", "userrating", "duration", "title", "originaltitle", "genre", "genreid", "plotoutline", "mpaa", "country", "premiered", "runtime", "firstaired", "season", "episode", "showtitle", "tvshowid", "episodeguide", "channel", "channeltype", "channelnumber", "starttime", "endtime"];
				this.browser.client.send('Playlist.GetItems', params)
				.then((response) => {
					list.setTotalMatchingItems(response.limits.total);
					if(params_in.offset == 0) {
						list.addListHeader(response.items[0].showtitle);
					}
					var index = params_in.offset;
					for(var item of response.items) {
						var params_item = {
							title: item.title,
							label: item.label,
							thumbnailUri: this.browser.client.getKodiImage(item.thumbnail, 215),
							actionIdentifier: 'Internal/goToPlaylistItem/1/' + index++
						};
						list.addListItem(params_item);
					}
					resolve(list);
				});
			}
			// Movies
			if(media_item_type == 'movie') {
				// Playing a movie doesn't seem to generate a usable playlist
				if(s.playlists[1].size == 1) {
					list.setTotalMatchingItems(1);
					var params_item = {
						title: s.media.caption,
						label: s.media.description,
						thumbnailUri: this.browser.client.getKodiImage(s.media.item.thumbnail, 215)
					};
/*
					let conf = {
						thumbnailUri: this.controller.getKodiImage(this.id, s.media.item.thumbnail, 215),
						uiAction: 'reload'
   				};
					list.addListTiles([conf, conf]);
*/

					list.addListItem(params_item);
					if(s.media.item.plot) {
						let configuration = {
	     				title: 'Plot',
	     				text: s.media.item.plot,
	     				affirmativeButtonText: 'OK'
	   				};
						list.addListInfoItem(configuration);
					}
					if(s.media.item.mpaa) {
						list.addListHeader(s.media.item.mpaa);
					}
					debug(list);

					resolve(list);
				};
			}
			if(media_item_type == 'unknown') {
				// Video files
				if(media_type == 'video') {
					params.playlistid = 1;
					params.properties = ["uniqueid", "thumbnail", "duration", "title", "starttime", "endtime"];
					this.browser.client.send('Playlist.GetItems', params)
					.then((response) => {
						list.setTotalMatchingItems(response.limits.total);
						if(params_in.offset == 0) {
							list.addListHeader(response.items[0].showtitle);
						}
						var index = params_in.offset;
						for(var item of response.items) {
							var params_item = {
								title: item.label,
								thumbnailUri: this.browser.client.getKodiImage(item.thumbnail, 215),
								actionIdentifier: 'Internal/goToPlaylistItem/1/' + index++
							};
							list.addListItem(params_item);
						}
						resolve(list);
					});
				}
			}
		});






	}
}
