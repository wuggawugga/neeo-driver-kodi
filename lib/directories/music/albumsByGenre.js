'use strict';

const BluePromise = require('bluebird');
const debug = require('debug')('neeo-driver-kodi:albumsByGenre');
const conf = require('../../Config');

module.exports = function Directory(browser) {
	this.browser = browser;
	this.library = this.browser.library;
	this.name = 'albumByGenre';
	this.title = 'Albums by Genre';
	this.path = '/music/albums/genre/:genre_id';
	this.thumbnail_widths = conf.get('thumbnail_widths');

	this.list = function(route_in, params_in) {
			return new BluePromise((resolve, reject) => {
				var genre_id = parseInt(route_in[1]);
				var genre = this.library.getMusicGenre(genre_id);
				let params_out = {
					filter: { field: 'genre', operator: 'contains', value: genre.title },
					limits: { start: params_in.start, end: params_in.end }
				};
				this.library.getAlbums(params_out).then((response) => {
					debug(response);

					debug('IN', params_in);
					debug('OUT', response.limits);
					var list_out = {
						title: 'Albums',
						total_items: response.limits.total,
						path: route_in[0],
						items: []
					};
					for(var item_in of response.albums) {
						var item_out = {
							title: item_in.title,
							label: item_in.displayartist,
							browseIdentifier: '/music/album/' + item_in.albumid
						};
						if(item_in.thumbnail) {
							item_out.thumbnailUri = this.browser.client.getKodiImage(item_in.thumbnail, this.thumbnail_widths.small);
							debug('THUMBNAIL', item_in.thumbnail);
						}
						list_out.items.push(item_out);
					}
					resolve(this.browser.formatList(list_out, params_in));
				});
			});
	}

}
