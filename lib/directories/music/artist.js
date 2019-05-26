'use strict';

const BluePromise = require('bluebird');
const neeoapi = require('neeo-sdk');
const debug = require('debug')('neeo-driver-kodi:foo');
const conf = require('../../Config');

module.exports = function Directory(browser) {
	this.browser = browser;
	this.library = this.browser.library;
	this.rand = Math.random();
	this.name = 'artist';
	this.title = 'Artist Details';
	this.path = '/music/artist/:artist_id';
	this.thumbnail_widths = conf.get('thumbnail_widths');

	this.list = function(route_in, params_in) {
		debug('ARTIST VIEW');
		return new BluePromise((resolve, reject) => {
			let artist_id = parseInt(route_in[1]);
			this.library.getArtistDetails(artist_id).then((artist) => {
				let params_out = {
					filter: { artistid: artist_id },
					limits: { start: params_in.start, end: 999 }
				};
				this.library.getAlbums(params_out).then(async (response) => {
					const options = {
						title: artist.artist,
						totalMatchingItems: response.limits.total,
						browseIdentifier: route_in[0],
						offset: params_in.offset,
						limit: params_in.limit
					};
					let albums_count = 0;
					let albums_by_artist = [];
					let albums_appears_on = [];
					let key = Object.keys(response)[0];
					for(var item_in of response[key]) {
						albums_count++;
						if(item_in.artistid == artist_id) {
							albums_by_artist.push(item_in);
						} else {
							albums_appears_on.push(item_in);
						}
					}

					let list_out = neeoapi.buildBrowseList(options);
					list_out.setListTitle(options.title);

					let caption_items = [];
					if(artist.style && artist.style.length > 0) {
						caption_items.push(artist.style.join(', '));
					}
					if(artist.yearsactive) {
						caption_items.push(artist.yearsactive);
					}

					// Header
					var item_out = {
						title: artist.artist
					};
					if(artist.thumbnail) {
						item_out.thumbnailUri = await this.browser.client.getKodiImage(artist.thumbnail, this.thumbnail_widths.small);
						debug(item_out.thumbnailUri);
					}
					if(artist.description) {
						if(caption_items.length > 0) {
							item_out.title = caption_items.join(' - ');
						}
						item_out.text = artist.description,
						item_out.affirmativeButtonText = 'Close'
						list_out.addListInfoItem(item_out);
					} else {
						item_out.label = caption_items.join(', ');
						list_out.addListItem(item_out);
					}

					// Albums
					if(albums_by_artist.length) {
						list_out.addListHeader('Albums');
						for(var item_in of albums_by_artist) {
							var item_out = {
								title: item_in.title,
								label: item_in.displayartist,
								browseIdentifier: '/music/album/' + item_in.albumid,
								thumbnailUri: await this.browser.client.getKodiImage(item_in.thumbnail, this.thumbnail_widths.small)
							};
							debug(item_out.thumbnailUri);
							list_out.addListItem(item_out);
						}
					}

					if(albums_appears_on.length) {
						list_out.addListHeader('Appears on');
						for(var item_in of albums_appears_on) {
							var item_out = {
								title: item_in.title,
								label: item_in.displayartist,
								browseIdentifier: '/music/album/' + item_in.albumid,
								thumbnailUri: await this.browser.client.getKodiImage(item_in.thumbnail, this.thumbnail_widths.small)
							};
							debug(item_out.thumbnailUri);
							list_out.addListItem(item_out);
						}
					}

					// Songs
					if(albums_count == 0) {
						// FIXME
					}


					resolve(list_out);
				});
			});
		});
	}

}
