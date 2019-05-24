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
	this.path = '/music/song/:song_id';

	this.list = function(route_in, params_in) {
		return new BluePromise((resolve, reject) => {
			let song_id = parseInt(route_in[1]);
			this.library.getSongDetails(song_id).then((song) => {
				debug('Song', song);

				const list_options = {
					title: song.title,
					totalMatchingItems: 1,
					browseIdentifier: route_in[0],
				};

				let list_out = neeoapi.buildBrowseList(list_options);
				list_out.setListTitle(list_options.title);

				list_out.addListItem({ title: 'Play Song', actionIdentifier: 'Internal/playSong/' + song_id });
				list_out.addListItem({ title: 'Queue Song', actionIdentifier: 'Internal/queueSong/' + song_id });

				if(song.albumid) {
					let album_id = song.albumid;
					let track = song.track ? song.track -1 : 0;
					list_out.addListItem({ title: 'Play Album', actionIdentifier: 'Internal/playAlbum/' + album_id + '/' + track });
					list_out.addListItem({ title: 'Queue Album', actionIdentifier: 'Internal/queueAlbum/' + album_id });


/*
					let params_out = {
						filter: { albumid: album_id },
						sort: { method: 'file' },
						limits: { start: params_in.start, end: 999 }
					};
					this.library.getSongs(params_out).then((songs) => {


					});
*/
				}
				resolve(list_out);
			});
		});
	}
}
