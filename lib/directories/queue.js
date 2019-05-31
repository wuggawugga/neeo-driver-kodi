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
			var list_out = neeoapi.buildBrowseList(listOptions);
			// Music tracks
			if(media_item_type == 'song') {
				params.playlistid = 0;
				params.properties = ["uniqueid", "thumbnail", "userrating", "duration", "artist", "artistid", "album", "albumid", "albumartist", "albumartistid", "albumlabel", "sorttitle", "title", "genre", "genreid", "track", "disc", "tag", "displayartist", "description"];
				this.browser.client.send('Playlist.GetItems', params)
				.then((response) => {
					list_out.setTotalMatchingItems(response.limits.total);
					if(params_in.offset == 0) {
						list_out.addListHeader(response.limits.total + ' Tracks');
					}
					var index = params_in.offset;
					if(response.items) {
						for(var item of response.items) {
							var params_item = {
								title: item.title,
								label: item.label,
								thumbnailUri: this.browser.client.getKodiImage(item.thumbnail, 215),
								actionIdentifier: [ 'Internal', 'goToPlaylistItem', 0, index++ ].join('|')
							};
							list_out.addListItem(params_item);
						}
					}
					resolve(list_out);
				});
			}
			// TV episodes
			if(media_item_type == 'episode') {
				params.playlistid = 1;
				params.properties = ["uniqueid", "thumbnail", "userrating", "duration", "title", "originaltitle", "genre", "genreid", "plotoutline", "mpaa", "country", "premiered", "runtime", "firstaired", "season", "episode", "showtitle", "tvshowid", "episodeguide", "channel", "channeltype", "channelnumber", "starttime", "endtime"];
				this.browser.client.send('Playlist.GetItems', params)
				.then((response) => {
					list_out.setTotalMatchingItems(response.limits.total);
					if(params_in.offset == 0) {
						list_out.addListHeader(response.items[0].showtitle);
					}
					var index = params_in.offset;
					for(var item of response.items) {
						var params_item = {
							title: item.title,
							label: item.label,
							thumbnailUri: this.browser.client.getKodiImage(item.thumbnail, 215),
							actionIdentifier: [ 'Internal', 'goToPlaylistItem', 1, index++ ].join('|')
						};
						list_out.addListItem(params_item);
					}
					resolve(list_out);
				});
			}
			// Movies
			if(media_item_type == 'movie') {
				// Playing a movie doesn't seem to generate a usable playlist
				if(s.playlists[1].size == 1) {
					list_out.setTotalMatchingItems(1);
					var params_item = {
						title: s.media.caption,
						label: s.media.description,
						thumbnailUri: this.browser.client.getKodiImage(s.media.item.thumbnail, 215)
					};
					let movie = s.media.item;
					list_out.addListHeader('Movie');
					var item_out = {
						title: s.media.caption,
						thumbnailUri: this.browser.client.getKodiImage(movie.thumbnail, this.thumbnail_widths.small)
					};
					if(movie.genre) item_out.title = movie.genre.join(', ');
					if(movie.country) item_out.label = '' + movie.country;
					list_out.addListItem(item_out);
					if(movie.tagline) list_out.addListHeader(movie.tagline);

					let list_buttons = [];
					if(movie.runtime) list_buttons.push({title: Math.floor(movie.runtime/60) + 'm', inverse: true});
					if(movie.rating) list_buttons.push({title: Number.parseFloat(movie.rating).toPrecision(2), inverse: true});
					if(movie.mpaa) list_buttons.push({title: movie.mpaa.replace(/Rated/, ''), inverse: true});;
					if(list_buttons.length > 0) {
						list_out.addListButtons(list_buttons)
					}
					if(movie.plot) {
						item_out = {
							title: 'Plot',
							text: movie.plot,
							affirmativeButtonText: 'Close'
						};
						list_out.addListInfoItem(item_out);
					}
					debug(list_out);
					resolve(list_out);
				};
			}
			if(media_item_type == 'unknown') {
				// Video files
				if(media_type == 'video') {
					params.playlistid = 1;
					params.properties = ["uniqueid", "thumbnail", "duration", "title", "starttime", "endtime"];
					this.browser.client.send('Playlist.GetItems', params)
					.then((response) => {
						list_out.setTotalMatchingItems(response.limits.total);
						if(params_in.offset == 0) {
							list_out.addListHeader(response.items[0].showtitle);
						}
						var index = params_in.offset;
						for(var item of response.items) {
							var params_item = {
								title: item.label,
								thumbnailUri: this.browser.client.getKodiImage(item.thumbnail, 215),
								actionIdentifier: [ 'Internal', 'goToPlaylistItem', 1, index++ ].join('|')
							};
							list_out.addListItem(params_item);
						}
						resolve(list_out);
					});
				}
			}
		});






	}
}
