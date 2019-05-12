'use strict';

/*
 *	KodiBrowser: Handles list and directories
 */

const debug = require('debug')('neeo-driver-kodi:KodiBrowser');
const neeoapi = require('neeo-sdk');
const BluePromise = require('bluebird');
const dotProp = require('dot-prop');
const KodiLibrary = require('./KodiLibrary');
const conf = require('./Configstore');
const tree = require('./KodiBrowserTree');

module.exports = class KodiBrowser {

	constructor(id, controller, client) {
		debug('CONSTRUCTOR');
		this.id = id;
		this.controller = controller;
		this.client = client;
		this.library = new KodiLibrary(this.id, this.client);
		this.directory_page_size = parseInt(conf.get('directory_page_size'));
	}

/*
	toString() {
    return 'KodiBrowser';
  }
*/

	browseDirectory(directory_id, params_in) {
		debug('browseDirectory()', directory_id, params_in);
		let params_out = {
			browseIdentifier: params_in.browseIdentifier || null,
			limit: this.directory_page_size,
			offset: params_in.offset || 0,
			start: params_in.offset || 0,
			end: this.directory_page_size
		};
		if(params_out.offset > 0) {
			params_out.end = params_out.offset + params_out.limit;
		}
		var path;
		return new BluePromise((resolve, reject) => {
			switch(directory_id) {
				case 'DIRECTORY_QUEUE':
					resolve(this.getQueue(params_out));
					break;
				case 'DIRECTORY_ROOT':
					path = params_out.browseIdentifier || 'root';
					this.buildList(path, params_out).then((list) => {
						var tmp = this.formatList(list, params_out);
						resolve(tmp);
					});
					break;
				case 'DIRECTORY_LIBRARY_AUDIO':
					path = params_out.browseIdentifier || 'root.music';
					this.buildList(path, params_out).then((list) => {
						var tmp = this.formatList(list, params_out);
						resolve(tmp);
					});
					break;
					/*
				case 'DIRECTORY_FAVOURITES':
					resolve(this.getFavourites(params_out));
					break;
				default:
					debug('default');
					break;
*/
			}
		});
	}

	getIndexItems(path, method) {
		let alpha = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
	}

	/*
	 *	Builds basic list structure
	 */
	buildList(path, params_in) {
		debug('buildList()', path, params_in);
		var node = dotProp.get(tree, path);
		debug('node', path, node);
		var params_api = {
			limits: {
				start: params_in.offset,
				end: params_in.offset + params_in.limit
			}
		};
		var list = {
			title: undefined,
			total_items: undefined,
			path: path,
			items: []
		};
		return new BluePromise((resolve, reject) => {
			if(node) {
				if(node.title) {
					list.title = node.title;
				}
				if(node.list) {
					if(node.list.params) Object.assign(params_api, node.list.params);
					debug('Populating from API');
					debug('PARAMS', node.list.params);
					debug('PARAMS', params_api);
					this.client.send(node.list.method, params_api)
					.then((response) => {
						debug('response', response);
						list.total_items = response.limits.total;
						for(var item_in of response[node.list.key]) {
							var item_out = {};
							// title
							item_out.title = item_in.title;
							// label
							if(item_in.label) item_out.label = item_in.label;
							// thumbnailUri
							if(typeof item_in.thumbnail !== undefined) item_out.thumbnailUri = this.controller.fetchKodiImage(this.id, item_in.thumbnail, 80);
							// browseIdentifier
							// actionIdentifier
							if(node.action) {
								item_out.actionIdentifier = node.action.method + '/' + item_in[node.action.param_key];
							}
							list.items.push(item_out);
						}
						debug('LIST', list);
						resolve(list);
					});
				} else {
					for(var [key, child] of Object.entries(node)) {
						var item = {};
						item.browseIdentifier = path + '.' + key;
						if(child.title) {
							item.title = child.title;
							if(child.label) item.label = child.label;
							if(child.action) {
								item.actionIdentifier = child.action.method + '/' + child.action.param;
							}
							list.items.push(item);
						}
					}
					list.total_items = list.items.length;
					debug('LIST', list);
					resolve(list);
				}
			}
		});
	}

	/*
	 *	Builds SDK list from basic list structure
	 */
	formatList(list_in, listOptions) {
		debug('formatList()', list_in, listOptions);
		const options = {
			title: list_in.title,
			totalMatchingItems: list_in.total_items,
			browseIdentifier: list_in.path,
			offset: listOptions.offset,
			limit: listOptions.limit
		};
		var list_out = neeoapi.buildBrowseList(options);
		list_out.setListTitle(options.title);
		for(var item_in of list_in.items) {
//			debug('item', item_in);
			var params = {
				title: item_in.title,
				browseIdentifier: item_in.browseIdentifier,
//				thumbnailUri: this.controller.kodiUrl(listOptions.device_id, item.art.thumb)
			};
			if(item_in.label) params.label = item_in.label;
			if(item_in.thumbnailUri) params.thumbnailUri = item_in.thumbnailUri;
			if(item_in.browseIdentifier) params.browseIdentifier = item_in.browseIdentifier;
			if(item_in.actionIdentifier) params.actionIdentifier = item_in.actionIdentifier;
	    list_out.addListItem(params);
	  }
		debug('LIST', list_out);
		return list_out;
	}

/*

getFavourites(params_in) {
	debug('getFavourites()', params_in);
	var s = this.client.state;

	var params = {
		playlist_id: undefined,
		properties: undefined,
		limits: {
			start: params_in.start,
			end: params_in.end,
		}
	};
	var listOptions = {
		title: 'Favourites',
		offset: params_in.offset,
		limit: params_in.limit
	};
	var list = neeoapi.buildBrowseList(listOptions);

	return new BluePromise((resolve, reject) => {
		if(media_item_type == 'song') {
			params.playlistid = 0;
			params.properties = ["uniqueid", "thumbnail", "userrating", "duration", "artist", "artistid", "album", "albumid", "albumartist", "albumartistid", "albumlabel", "sorttitle", "title", "genre", "genreid", "track", "disc", "tag", "displayartist", "description"];
			this.client.send('Playlist.GetItems', params)
			.then((response) => {
				list.setTotalMatchingItems(response.limits.total);
				if(params_in.offset == 0) {
					list.addListHeader(response.limits.total + ' Tracks');
				}
				var index = params_in.offset;
				for(var item of response.items) {
					var params_item = {
						title: item.title,
						label: item.label,
						thumbnailUri: this.controller.fetchKodiImage(this.id, item.thumbnail, 80),
						actionIdentifier: 'Player.GoTo 0 ' + index++
					};
					list.addListItem(params_item);
				}
				resolve(list);
			});
		}
	});
}






	formatList(response, listOptions, title) {
		debug('formatList()');

		var itemlist = response.items;

	  if (listOptions.total < listOptions.limit) {
	    listOptions.limit = listOptions.total;
	  }

	  let browseIdentifier = listOptions.browseIdentifier;

	  const options = {
	    title: `Browsing ${title}`,
	    totalMatchingItems: itemlist.total,
	    browseIdentifier,
	    offset: listOptions.offset || 0,
	    limit: listOptions.limit
	  };

	  var list = neeoapi.buildBrowseList(options);
		list.setListTitle(listOptions.title);

	  itemlist.map(item => {
			var params = {
				title: item.title,
				label: item.label,
				thumbnailUri: this.controller.kodiUrl(this.id, item.art.thumb)
			};
	    list.addListItem(params);
	  });

		debug('formatList() list', list);
	  return list;
	}
*/

	/*
	 *	Builds lists for the QUEUE directory
	 */
	getQueue(params_in) {
		// Caveat: This is assuming that all playlist items are the same media type
		debug('getQueue()', params_in);
		var s = this.client.state;
		s.updatePlaylists();

		var params = {
			playlist_id: undefined,
			properties: undefined,
			limits: {
				start: params_in.start,
				end: params_in.end,
			}
		};
		var listOptions = {
			title: 'Current Playlist',
			offset: params_in.offset,
			limit: params_in.limit
		};
		var list = neeoapi.buildBrowseList(listOptions);
//		list.setListTitle(listOptions.title);
		var media_type = this.client.state.get('media.type');
		var media_item_type = this.client.state.get('media.item.type');
		debug('TYPE', media_type, media_item_type);
		return new BluePromise((resolve, reject) => {
			// Music tracks
			if(media_item_type == 'song') {
				params.playlistid = 0;
				params.properties = ["uniqueid", "thumbnail", "userrating", "duration", "artist", "artistid", "album", "albumid", "albumartist", "albumartistid", "albumlabel", "sorttitle", "title", "genre", "genreid", "track", "disc", "tag", "displayartist", "description"];
				this.client.send('Playlist.GetItems', params)
				.then((response) => {
					list.setTotalMatchingItems(response.limits.total);
					if(params_in.offset == 0) {
						list.addListHeader(response.limits.total + ' Tracks');
					}
					var index = params_in.offset;
					for(var item of response.items) {
						var params_item = {
							title: item.title,
							label: item.label,
							thumbnailUri: this.controller.fetchKodiImage(this.id, item.thumbnail, 80),
							actionIdentifier: 'Player.GoTo 0 ' + index++
						};
						list.addListItem(params_item);
					}
					resolve(list);
				});
			}
			// TV episodes
			if(media_item_type == 'episode') {
				params.playlistid = 1;
				params.properties = ["uniqueid", "thumbnail", "userrating", "duration", "title", "originaltitle", "genre", "genreid", "plotoutline", "mpaa", "country", "premiered", "runtime", "firstaired", "season", "episode", "showtitle", "tvshowid", "episodeguide", "channel", "channeltype", "channelnumber", "starttime", "endtime"];
				this.client.send('Playlist.GetItems', params)
				.then((response) => {
					list.setTotalMatchingItems(response.limits.total);
					if(params_in.offset == 0) {
						list.addListHeader(response.items[0].showtitle);
					}
					var index = params_in.offset;
					for(var item of response.items) {
						var params_item = {
							title: item.title,
							label: item.label,
							thumbnailUri: this.controller.fetchKodiImage(this.id, item.thumbnail, 80),
							actionIdentifier: 'Player.GoTo 1 ' + index++
						};
						list.addListItem(params_item);
					}
					resolve(list);
				});
			}
			// Movies
			if(media_item_type == 'movie') {
				// Playing a movie doesn't seem to generate a usable playlist
				if(s.playlists[1].size == 1) {
					list.setTotalMatchingItems(1);
					var params_item = {
						title: s.media.caption,
						label: s.media.description,
						thumbnailUri: this.controller.fetchKodiImage(this.id, s.media.item.thumbnail, 80)
					};
/*
					let conf = {
						thumbnailUri: this.controller.fetchKodiImage(this.id, s.media.item.thumbnail, 215),
						uiAction: 'reload'
   				};
					list.addListTiles([conf, conf]);
*/

					list.addListItem(params_item);
					if(s.media.item.plot) {
						let configuration = {
	     				title: 'Plot',
	     				text: s.media.item.plot,
	     				affirmativeButtonText: 'OK'
	   				};
						list.addListInfoItem(configuration);
					}
					if(s.media.item.mpaa) {
						list.addListHeader(s.media.item.mpaa);
					}
					debug(list);

					resolve(list);
				};
			}
			if(media_item_type == 'unknown') {
				// Video files
				if(media_type == 'video') {
					params.playlistid = 1;
					params.properties = ["uniqueid", "thumbnail", "duration", "title", "starttime", "endtime"];
					this.client.send('Playlist.GetItems', params)
					.then((response) => {
						list.setTotalMatchingItems(response.limits.total);
						if(params_in.offset == 0) {
							list.addListHeader(response.items[0].showtitle);
						}
						var index = params_in.offset;
						for(var item of response.items) {
							var params_item = {
								title: item.label,
								thumbnailUri: this.controller.fetchKodiImage(this.id, item.thumbnail, 80),
								actionIdentifier: 'Player.GoTo 1 ' + index++
							};
							list.addListItem(params_item);
						}
						resolve(list);
					});
				}
			}
		});
	}

}
