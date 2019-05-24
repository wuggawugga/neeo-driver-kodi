'use strict';

const BluePromise = require('bluebird');
// const neeoapi = require('neeo-sdk');
const debug = require('debug')('neeo-driver-kodi:showsByTitle');


module.exports = function Directory(browser) {
	this.browser = browser;
	this.library = this.browser.library;
	this.rand = Math.random();
	this.name = 'showsByTitle';
	this.title = 'TV Shows by Title';
	this.path = '/video/tv_shows/by_title';

	this.list = function(route_in, params_in) {
			return new BluePromise((resolve, reject) => {
				let params_out = {
					limits: { start: params_in.start, end: params_in.end }
				};
				this.library.GetTVShows(params_out).then((response) => {
					var list_out = {
						title: 'TV Shows',
						total_items: response.limits.total,
						path: '/video/tv_shows/by_title',
						items: []
					};
					let key = 'tvshows';
					for(var item_in of response.tvshows) {
						var item_out = {
							title: item_in.title,
							browseIdentifier: '/video/tv_show/' + item_in.tvshowid,
							thumbnailUri: this.browser.client.fetchKodiImage(item_in.thumbnail, 100)
						};
						let label_items = [];
						if(item_in.year) label_items.push(item_in.year);
						if(item_in.genre && item_in.genre.length) label_items.push(item_in.genre.join(', '));
						if(label_items.length) item_out.label = label_items.join(' - ');
						list_out.items.push(item_out);
					}
					resolve(this.browser.formatList(list_out, params_in));
				});
			});
	}

}
