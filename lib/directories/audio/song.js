'use strict';

const BluePromise = require('bluebird');
const neeoapi = require('neeo-sdk');


const debug = require('debug')('neeo-driver-kodi:foo');


module.exports = function Directory(browser) {
	this.browser = browser;
	this.library = this.browser.library;
	this.name = 'album';
	this.title = 'Album details';
	this.path = '/audio/song/:song_id';

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

				var item_out = {
					title: 'Artist: ' + song.displayartist,
					label: 'Album: ' + song.album,
					browseIdentifier: '/audio/album/' + song.albumid,
				};
				if(song.thumbnail) {
					item_out.thumbnailUri = this.browser.client.getKodiImage(song.thumbnail, 215);
				}
				list_out.addListItem(item_out);

				if(song.lyrics) {
					item_out = [];
					item_out.title = 'Lyrics',
					item_out.text = song.lyrics
					item_out.affirmativeButtonText = 'Close'
					list_out.addListInfoItem(item_out);
				}

				list_out.addListButtons([
					{ title: 'Play Song', uiAction: 'close', actionIdentifier: 'AudioPlayer/playSong/' + song_id },
					{ title: 'Queue Song', uiAction: 'goBack', actionIdentifier: 'AudioPlayer/queueSong/' + song_id }
				]);

				if(song.albumid) {
					let album_id = song.albumid;
					let track = song.track ? song.track -1 : 0;
					list_out.addListButtons([
						{ title: 'Play Album', uiAction: 'close', actionIdentifier: 'AudioPlayer/playAlbum/' + album_id + '/' + track },
						{ title: 'Queue Album', uiAction: 'goBack', actionIdentifier: 'AudioPlayer/queueAlbum/' + album_id }
					]);


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
