'use strict';

const BluePromise = require('bluebird');
const neeoapi = require('neeo-sdk');


const debug = require('debug')('neeo-driver-kodi:foo');


module.exports = function Directory(browser) {
	this.browser = browser;
	this.library = this.browser.library;
	this.rand = Math.random();
	this.name = 'album';
	this.title = 'Album details';
	this.path = '/music/albums/wall';

	this.list = async function(route_in, params_in) {
		return new BluePromise((resolve, reject) => {
			let params_out = {
				properties: ["title", "thumbnail", "displayartist"],
				limits: { start: params_in.start, end: params_in.end },
				sort: { method: "random" }
			};
			this.library.getAlbums(params_out).then(async (response) => {
				const list_options = {
					title: 'Album Wall',
					browseIdentifier: route_in[0],
					totalMatchingItems: response.limits.total,
				};
				let list_out = neeoapi.buildBrowseList(list_options);
				list_out.setListTitle(list_options.title);

				var count = 0;
				var items = [];
				for(let album of response.albums) {
					debug('+++++++++++++++++++ ALBUM', album);
					if(!album.thumbnail) {
						debug('SKIPPING');
						continue;
					}
					let url = this.browser.client.fetchKodiImage(album.thumbnail, 215);
					items.push({thumbnailUri: await url});
//					items.push({thumbnailUri:  this.browser.client.kodiUrl(album.thumbnail, 215)});
					count++;
					if(count % 2 == 0) {
						list_out.addListTiles(items);
						items = [];
					}

				}
				resolve(list_out);
			});
		});
	}
}
