'use strict';

const BluePromise = require('bluebird');
const neeoapi = require('neeo-sdk');
const debug = require('debug')('neeo-driver-kodi:foo');
const conf = require('../Config');

module.exports = function Directory(browser) {
	this.browser = browser;
	this.library = this.browser.library;
	this.name = 'nowPlaying';
	this.title = 'Now Playing';
	this.path = '/now_playing';
	this.thumbnail_widths = conf.get('thumbnail_widths');

	this.list = function(route_in, params_in) {
		var s = this.browser.client.state;
		var media_item_type = s.get('media.item.type');
		var params = {
			playlist_id: undefined,
			properties: undefined,
			limits: {
				start: params_in.start,
				end: params_in.end,
			}
		};
		var list_options = {
			title: 'Currently Playing',
			offset: params_in.offset,
			limit: params_in.limit
		};
		debug('TYPE', media_item_type);
		try {
			return new BluePromise((resolve, reject) => {
				var list_out = neeoapi.buildBrowseList(list_options);
				var i = s.get('media.item');
				var o = null;
				switch(media_item_type) {
					case 'song':
						list_out.addListHeader(i.title);
						// Artist
						o = {title: i.artist.join(', ')};
						var artist_thumb = i.art['artist.thumb'];
						if(artist_thumb) o.thumbnailUri = this.browser.client.getKodiImage(artist_thumb, this.thumbnail_widths.small);
						list_out.addListItem(o);
						// Album
						if(i.album) {
							o = {
								title: i.album,
								label: i.albumartist.join(', '),
							};
							if(i.thumbnail) o.thumbnailUri = this.browser.client.getKodiImage(i.thumbnail, this.thumbnail_widths.small);
							if(i.albumid) o.browseIdentifier = '/audio/album/' + i.albumid;
							list_out.addListItem(o);
						}
						if(i.lyrics) {
							list_out.addListInfoItem({
					     title: 'Show lyrics',
					     text: i.lyrics,
					     affirmativeButtonText: 'OK'
		   	 			});
						}
						break;
					case 'episode':
						list_out.addListHeader('Episode');
						break;
					case 'movie':
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
						if(movie.runtime) list_buttons.push({title: String.fromCodePoint(8987) + '' + Math.floor(movie.runtime/60) + 'm', inverse: true});
						if(movie.rating) list_buttons.push({title: String.fromCodePoint(11088) + '' + Number.parseFloat(movie.rating).toPrecision(2), inverse: true});
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
						break;
					default:
						list_out.addListHeader('No information available');
						break;
				}
				debug('RESOLV');
				resolve(list_out);
			});
		} catch(error) {
			debug('Caught', error);
		}


	}

}
