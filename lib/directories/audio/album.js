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
	this.path = '/audio/album/:album_id';

	this.list = function(route_in, params_in) {
		debug('Route', route_in);
		debug('Params', params_in);
		return new BluePromise((resolve, reject) => {
			let album_id = parseInt(route_in[1]);
			this.library.getAlbumDetails(album_id).then((album) => {
				let params_out = {
					filter: { albumid: album_id },
					sort: { method: 'file' },
					limits: { start: params_in.start, end: 999 }
				};
				this.library.getSongs(params_out).then(async (songs) => {
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
						browseIdentifier: '/audio/album/' + album.albumid,
					};
					if(album.thumbnail) {
						item_out.thumbnailUri = await this.browser.client.getKodiImage(album.thumbnail, 215);
					}
					list_out.addListItem(item_out);

					// Songs
					for(var item_in of songs.songs) {
						var item_out = {
							title: item_in.title,
							label: item_in.displayartist,
							browseIdentifier: '/audio/song/' + item_in.songid,
						};
						if(item_in.duration) {
							let duration = null;
							duration  = Math.floor(item_in.duration / 60);
							duration += ':';
							duration += item_in.duration % 60;
							item_out.title += ' (' + duration + ')';
						}
						list_out.addListItem(item_out);
					}

					// Buttons
					list_out.addListButtons([
						{ title: 'Play Album', actionIdentifier: ['AudioPlayer' ,'playAlbum', album.albumid].join('|'), uiAction: 'close' },
						{ title: 'Queue Album', actionIdentifier: ['AudioPlayer' ,'queueAlbum', album.albumid].join('|'), uiAction: 'close' }
					]);

					resolve(list_out);
				});
			});
		});
	}

}
