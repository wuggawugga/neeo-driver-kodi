'use strict';

const BluePromise = require('bluebird');
const debug = require('debug')('neeo-driver-kodi:tvshowsByGenre');
const conf = require('../../../Config');

module.exports = function Directory(browser) {
	this.browser = browser;
	this.library = this.browser.library;
	this.name = 'tvshowsByGenre';
	this.title = 'TV Shows by Genre';
	this.path = '/video/tvshows/genre/:genre_id';
	this.thumbnail_widths = conf.get('thumbnail_widths');

	this.list = function(route_in, params_in) {
		return new BluePromise(async (resolve, reject) => {
			var genre_id = parseInt(route_in[1]);
			var genre = await this.library.getVideoGenre(genre_id);
			let params_out = {
				properties: ['title', 'thumbnail', 'genre', 'year'],
				filter: { field: 'genre', operator: 'contains', value: genre.label },
				limits: { start: params_in.start, end: params_in.end }
			};
			// FIXME: Use KodiLibrary because of reasons
			this.browser.client.send('VideoLibrary.GetTVShows', params_out).then((response) => {
				var list_out = {
					title: 'TV Shows',
					total_items: response.limits.total,
					path: route_in[0],
					items: []
				};
				if(response.limits && response.limits.total > 0) {
					for(var item_in of response.tvshows) {
						var item_out = {
							title: item_in.title,
							label: '',
							browseIdentifier: '/video/tvshow/' + item_in.tvshowid
						};
						if(item_in.year) item_out.title += '(' + item_in.year + ')';
						if(item_in.genre && item_in.genre.length) item_out.label = item_in.genre.join(', ');
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
