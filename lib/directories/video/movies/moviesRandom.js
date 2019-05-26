'use strict';

const BluePromise = require('bluebird');
const neeoapi = require('neeo-sdk');
const debug = require('debug')('neeo-driver-kodi:foo');
const conf = require('../../../Config');

module.exports = function Directory(browser) {
	this.browser = browser;
	this.library = this.browser.library;
	this.name = 'randomMovies';
	this.title = 'Random Movies';
	this.path = '/video/movies/random';
	this.thumbnail_widths = conf.get('thumbnail_widths');

	this.list = function(route_in, params_in) {
		return new BluePromise((resolve, reject) => {
			let params_out = {
				sort: {method: 'random'},
				limits: { start: params_in.start, end: params_in.end }
			};
			this.library.getMovies(params_out).then((response) => {

				const list_options = {
					title: 'Random Movies',
					browseIdentifier: route_in[0],
					totalMatchingItems: response.limits.total,
				};

				let list_out = neeoapi.buildBrowseList(list_options);
				list_out.setListTitle(list_options.title);

				for(var item_in of response.movies) {
					var item_out = {
						title: item_in.title,
						browseIdentifier: '/video/movie/' + item_in.movieid
					};
					if(item_in.thumbnail) {
						item_out.thumbnailUri = this.browser.client.getKodiImage(item_in.thumbnail, this.thumbnail_widths.small);
					}
					if(item_in.year) {
						item_out.title = item_in.title + '(' + item_in.year + ')';
					}
					let label_parts = [];
					if(item_in.country) label_parts.push(item_in.country);
					if(item_in.genre.length) label_parts.push(item_in.genre.join(', '));
					if(item_in.runtime) label_parts.push(Math.floor(item_in.runtime/60) + ' Minutes');
					if(item_in.rating) label_parts.push(Number.parseFloat(item_in.rating).toPrecision(2))
					item_out.label = label_parts.join(' - ');
					list_out.addListItem(item_out);
				}
				resolve(list_out);
			});
		});
	}
}
