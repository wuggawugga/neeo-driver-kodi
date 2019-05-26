'use strict';

const BluePromise = require('bluebird');
// const neeoapi = require('neeo-sdk');
const debug = require('debug')('neeo-driver-kodi:artistsByName');


module.exports = function Directory(browser) {
	this.browser = browser;
	this.library = this.browser.library;
	this.rand = Math.random();
	this.name = 'artistsByName';
	this.title = 'Artists by name';
	this.label = 'Something';
	this.path = '/music/artists/by_name';

	this.list = function(route_in, params_in) {
			return new BluePromise((resolve, reject) => {
				let params_out = {
					limits: { start: params_in.start, end: params_in.end }
				};
				this.library.getArtists(params_out).then((response) => {
					debug('IN', params_in);
					debug('OUT', response.limits);
					var list_out = {
						title: 'Artists',
						total_items: response.limits.total,
						path: '/music/artists/by_name',
						items: []
					};
					let key = Object.keys(response)[0];
					for(var item_in of response[key]) {
						var item_out = {
							title: item_in.artist,
							label: item_in.label,
							browseIdentifier: '/music/artist/' + item_in.artistid
						};
						if(item_in.thumbnail) {
							item_out.thumbnailUri = this.browser.client.getKodiImage(item_in.thumbnail, 100);
						}
						list_out.items.push(item_out);
					}
					resolve(this.browser.formatList(list_out, params_in));
				});
			});
	}

}
