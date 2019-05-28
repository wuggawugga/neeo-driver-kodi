'use strict';

const BluePromise = require('bluebird');
const debug = require('debug')('neeo-driver-kodi:musicVideosByGenre');
const conf = require('../../../Config');

module.exports = function Directory(browser) {
	this.browser = browser;
	this.library = this.browser.library;
	this.name = 'musicVideosByGenre';
	this.title = 'Music Videos by Genre';
	this.path = '/video/musicvideos/genre/:genre_id';
	this.thumbnail_widths = conf.get('thumbnail_widths');

	this.list = function(route_in, params_in) {
		return new BluePromise(async (resolve, reject) => {
			var genre_id = parseInt(route_in[1]);
			var genre = await this.library.getAudioGenre(genre_id);
			let params_out = {
				properties: ['title', 'artist', 'thumbnail', 'genre', 'runtime', 'year'],
				filter: { field: 'genre', operator: 'contains', value: genre.label },
				limits: { start: params_in.start, end: params_in.end }
			};
			// FIXME: Use KodiLibrary because of reasons
			this.browser.client.send('VideoLibrary.getMusicVideos', params_out).then((response) => {
				var list_out = {
					title: 'Music Videos',
					total_items: response.limits.total,
					path: route_in[0],
					items: []
				};
				if(response.limits && response.limits.total > 0) {
					for(var item_in of response.musicvideos) {
						var item_out = {
							title: item_in.title,
							label: item_in.artist.join(', '),
							browseIdentifier: '/video/musicvideo/' + item_in.musicvideoid
						};
						if(item_in.year) item_out.title += ' (' + item_in.year + ')';
						if(item_in.thumbnail) {
							item_out.thumbnailUri = this.browser.client.getKodiImage(item_in.thumbnail, this.thumbnail_widths.small);
						}
						list_out.items.push(item_out);
					}
				}
				resolve(this.browser.formatList(list_out, params_in));
			});
		});
	}
}
