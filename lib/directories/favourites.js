'use strict';

const BluePromise = require('bluebird');
const neeoapi = require('neeo-sdk');
const debug = require('debug')('neeo-driver-kodi:favourites');
const conf = require('../Config');

module.exports = function Directory(browser) {
	this.browser = browser;
//	this.library = this.browser.library;
	this.name = 'favourites';
	this.title = 'Favourites';
	this.path = '/favourites';
	this.thumbnail_widths = conf.get('thumbnail_widths');

	this.list = function(route_in, params_in) {
		return new BluePromise(async (resolve, reject) => {
			debug('PARAMS', params_in);
			let params_out = {
				properties: ["window", "windowparameter", "thumbnail", "path"],
//				limits: { start: params_in.start, end: params_in.end }
			};
			var list_out = {
				title: 'Favourites',
				offset: params_in.offset,
				limit: params_in.limit,
				path: route_in[0],
				items: []
			};
			this.browser.client.send('Favourites.GetFavourites', params_out).then((response) => {
				list_out.total_items = response.limits.total;
				debug('RESPONSE', response);

				for(let item_in of response.favourites) {
					let item_out = {
						title: item_in.title,
						label: item_in.type,
						browseIdentifier: '/video/tvshow/' + item_in.tvshowid
					};
					switch(item_in.type) {
						case 'media':
							item_out.actionIdentifier = [ 'Player', 'Open', item_in.path ].join('|');
							break;
						case 'window':
							item_out.actionIdentifier = [ 'Internal', 'ActivateWindow', item_in.window, item_in.windowparameter ].join('|');
							break;
					}
					item_out.thumbnailUri = this.browser.client.getKodiImage(item_in.thumbnail, this.thumbnail_widths.small);
					list_out.items.push(item_out);
				}

				resolve(this.browser.formatList(list_out, params_in));
			});
		});
	}
}
