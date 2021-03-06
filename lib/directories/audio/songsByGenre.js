'use strict';

const BluePromise = require('bluebird');
const debug = require('debug')('neeo-driver-kodi:songsByGenre');
const conf = require('../../Config');

module.exports = function Directory(browser) {
	this.browser = browser;
	this.library = this.browser.library;
	this.name = 'songsByGenre';
	this.title = 'Songs by Genre';
	this.path = '/audio/songs/genre/:genre_id';
	this.thumbnail_widths = conf.get('thumbnail_widths');

	this.list = function(route_in, params_in) {
			return new BluePromise(async (resolve, reject) => {
				var genre_id = parseInt(route_in[1]);
				var genre = await this.library.getAudioGenre(genre_id);
				let params_out = {
					filter: { field: 'genre', operator: 'contains', value: genre.label },
					limits: { start: params_in.start, end: params_in.end }
				};
				this.library.getSongs(params_out).then((response) => {
					var list_out = {
						title: 'Songs',
						total_items: response.limits.total,
						path: route_in[0],
						items: []
					};
					for(var item_in of response.songs) {
						var item_out = {
							title: item_in.title,
							label: item_in.displayartist,
							browseIdentifier: '/audio/song/' + item_in.songid
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
