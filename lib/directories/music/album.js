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
	this.path = '/music/album/:album_id';

	this.list = function(route_in, params_in) {
		debug('Route', route_in);
		debug('Params', params_in);
		return new BluePromise((resolve, reject) => {
			let album_id = parseInt(route_in[1]);
			this.library.getAlbumDetails(album_id).then((album) => {
				debug('Album', album);
				let params_out = {
					filter: { albumid: album_id },
					limits: { start: params_in.start, end: 999 }
				};
				this.library.getSongs(params_out).then((response) => {
					debug('Songs', response);


									const list_options = {
										title: album.title,
										totalMatchingItems: 1,
										browseIdentifier: route_in[0],
										offset: params_in.offset,
										limit: params_in.limit
									};


									let list_out = neeoapi.buildBrowseList(list_options);
									list_out.setListTitle(list_options.title);

									// Header
									var item_out = {
										title: album.title,
										label: 'Album by ' + album.displayartist,
										browseIdentifier: '/music/album/' + album.albumid,
									};
									if(album.thumbnail) {
										item_out.thumbnailUri = this.browser.controller.fetchKodiImage(this.browser.id, album.thumbnail, 100);
									}
									list_out.addListItem(item_out);


									resolve(list_out);



				});
			});
		});
	}

}
