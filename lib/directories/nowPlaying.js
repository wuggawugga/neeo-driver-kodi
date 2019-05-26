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
				var list = neeoapi.buildBrowseList(list_options);
				var i = s.get('media.item');
				var o = null;
				switch(media_item_type) {
					case 'song':
						list.addListHeader(i.title);
						// Artist
						o = {title: i.artist.join(', ')};
						var artist_thumb = i.art['artist.thumb'];
						if(artist_thumb) o.thumbnailUri = this.browser.client.getKodiImage(artist_thumb, this.thumbnail_widths.small);
						list.addListItem(o);
						// Album
						if(i.album) {
							o = {
								title: i.album,
								label: i.albumartist.join(', '),
							};
							if(i.thumbnail) o.thumbnailUri = this.browser.client.getKodiImage(i.thumbnail, this.thumbnail_widths.small);
							if(i.albumid) o.browseIdentifier = '/music/album/' + i.albumid;
							list.addListItem(o);
						}
						if(i.lyrics) {
							list.addListInfoItem({
					     title: 'Show lyrics',
					     text: i.lyrics,
					     affirmativeButtonText: 'OK'
		   	 			});
						}
						break;
					case 'episode':
						list.addListHeader('Episode');
						break;
					case 'movie':
						list.addListHeader('Movie');
						break;
					default:
						list.addListHeader('No information available');
						break;
				}
				debug('RESOLV');
				resolve(list);
			});
		} catch(error) {
			debug('Caught', error);
		}


	}

}
