'use strict';

/*
 *	KodiBrowser: Handles list and directories
 */

const debug = require('debug')('neeo-driver-kodi:KodiBrowser');
const neeoapi = require('neeo-sdk');
const BluePromise = require('bluebird');
const dotProp = require('dot-prop');
const KodiLibrary = require('./KodiLibrary');
const conf = require('./Config');
const tree = require('./KodiBrowserTree');
const pathToRegexp = require('path-to-regexp');


module.exports = class KodiBrowser {

	constructor(id, controller, client) {
		debug('CONSTRUCTOR');
		this.id = id;
		this.controller = controller;
		this.client = client;
		this.library = new KodiLibrary(this.id, this.client);
		this.directory_page_size = parseInt(conf.get('directory_page_size'));

		this.routes = [];
		this.dirs = new (require('./directories'))(this);
		this._setupRoutes(this.dirs);
		// Push default route as the last item
		this.routes.push({
			name: 'default',
			path: '/:key*',
			list: (path_in, params) => {
				return new BluePromise((resolve, reject) => {
					this.buildList(path_in, params).then((list) => {
						debug('callback resolves', list.constructor.name);
						resolve(this.formatList(list, params));
					});
				});
			}
		});
		debug('ROUTES:');
		for(var route of this.routes) {
			debug('\t', route.name, route.path);
		}
	}

	_setupRoutes(node_in) {
		if(node_in.path) {
			this.routes.push(node_in);
		}
		if(node_in.nodes) {
			for(let node of node_in.nodes) {
				this._setupRoutes(node);
			}
		}
	}


	router(path, params) {
		debug('router()', path);
			return new BluePromise((resolve, reject) => {
				var res = null;
				var keys = [];
				var regexp;
				for(var route of this.routes) {
					// debug('ROUTE', route.name);
					regexp = pathToRegexp(route.path, keys);
					res = regexp.exec(path);
					// debug('REGEX', res, keys);
					if(res !== null) {
						// debug('HEYO');
						debug('Route matched:', route.name);
						debug('\t', path, route.path);
						route.list(res, params).then((list) => {
							if(list.constructor.name == 'default_1') {
								debug('router() resolves', list.constructor.name);
								resolve(list);
							} else {
								reject('Invalid list');
							}
						});
						break;
					}
				}
				if(res == null) {
					reject('Invalid path');
				}
			});
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
					path = params_out.browseIdentifier || '/';
//					resolve(this.router(path, params_out));
					this.router(path, params_out).then((feck) => {
						debug('browseDirectory() resolves', feck.constructor.name);
						resolve(feck);
					}).catch((err) => {
						debug('ARSE', err);
					});
/*
					debug('DRINK');
*/
//					resolve(foo);
/*
					this.buildList(path, params_out).then((list) => {
						var tmp = this.formatList(list, params_out);
						resolve(tmp);
					});
*/
					break;
				case 'DIRECTORY_LIBRARY_AUDIO':
					path = params_out.browseIdentifier || 'root.music';
					this.buildList(path, params_out).then((list) => {
						var tmp = this.formatList(list, params_out);
						resolve(tmp);
					});
					break;
				case 'DIRECTORY_NOW_PLAYING':
					resolve(this.getNowPlaying(params_out));
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


	/*
	 *	Builds basic list structure
	 */
	buildList(path_in, params_in) {
		debug('buildList()', path_in, params_in);
		return new BluePromise((resolve, reject) => {
			const root = tree.root;
			var path = path_in[0];
			var dotPath = path.substring(1).replace(/\//g, '.');
			var node = undefined;
			// debug('DOT', dotPath);
			if(dotProp.get(root, dotPath)) {
				node = dotProp.get(root, dotPath);
			} else {
				node = root;
				path = '';
			}
//			debug('NODE', path, node);
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
			if(node) {
				if(node.index) {
					// FIXME: CBA
					resolve(this.buildIndex(path, {}));
				}
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
//						debug('response', response);
						list.total_items = response.limits.total;
						let key = Object.keys(response)[0];
						for(var item_in of response[key]) {
							var item_out = {};
							// title
							item_out.title = item_in.title;
							// label
							if(node.list.item_label) {
								item_out.label = dotProp.get(item_in, node.list.item_label, '');
							} else if(item_in.label) {
								item_out.label = item_in.label || '';
							}
							// thumbnailUri
							if(typeof item_in.thumbnail !== undefined) item_out.thumbnailUri = this.client.getKodiImage(item_in.thumbnail, 215);
							// browseIdentifier
							if(node.list.item_path) {
								item_out.browseIdentifier = node.list.item_path.replace(/\*/g, item_in[node.list.item_key]);
								debug('PATH', item_out.browseIdentifier);
							}
							// actionIdentifier
							if(node.action) {
								item_out.actionIdentifier = node.action.method + '/' + item_in[node.action.param_key];
							}
							list.items.push(item_out);
						}
//						debug('LIST', list);
						debug('buildList() resolves', list.constructor.name);
						resolve(list);
					});
				} else {
					for(var [key, child] of Object.entries(node)) {
						if(child.disabled === true || child.enabled === false) continue;
						var item = {};
						if(child.browseIdentifier) {
							item.browseIdentifier = child.browseIdentifier;
						} else {
							item.browseIdentifier = path + '/' + key;
						}
						if(child.actionIdentifier) {
							item.actionIdentifier = child.actionIdentifier;
						}
						if(child.title) {
							item.title = child.title;
							if(child.label) item.label = child.label;
							// If a node has both list and action, action applies to listed children
							if(child.action && !child.list) {
								item.actionIdentifier = child.action.method + '/' + child.action.param;
							}
							list.items.push(item);
						}
					}
					list.total_items = list.items.length;
//					debug('LIST', list);
					resolve(list);
				}
			}
		});
	}

	/*
	 *	Builds SDK list from basic list structure
	 */
	async formatList(list_in, listOptions) {
		debug('formatList()');
		const options = {
			title: list_in.title,
			totalMatchingItems: list_in.total_items,
			browseIdentifier: list_in.path,
			offset: listOptions.offset,
			limit: listOptions.limit
		};
		var list_out = neeoapi.buildBrowseList(options);
		list_out.setListTitle(options.title);
		list_out.addListHeader(options.browseIdentifier);
//		var promises = [];
		for(var item_in of list_in.items) {
//			debug('item', item_in);
			var params = {
				title: item_in.title,
				browseIdentifier: item_in.browseIdentifier,
//				thumbnailUri: this.controller.kodiUrl(listOptions.device_id, item.art.thumb)
			};
			if(item_in.label) params.label = item_in.label;
			if(item_in.thumbnailUri) {
				params.thumbnailUri = await item_in.thumbnailUri;
				debug(item_in.thumbnailUri);
				debug('TYPEOF', typeof item_in.thumbnailUri);
				debug('CNAME', item_in.thumbnailUri.constructor.name);
				// if(item_in.thumbnailUri.constructor.name == 'Promise') {
				// 	promises.push(item_in.thumbnailUri);
				// }
			}
			if(item_in.browseIdentifier) params.browseIdentifier = item_in.browseIdentifier;
			if(item_in.actionIdentifier) params.actionIdentifier = item_in.actionIdentifier;
	    list_out.addListItem(params);
	  }
//		debug('LIST', list_out);
//		await BluePromise.all(promises);
		debug('formatList() returns', list_out.constructor.name);
		return list_out;
	}

/*


buildIndex(path, params) {
	debug('getIndexItems()');
	let alpha = '#ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
	let list = {
		title: params.title || 'Index',
		total_items: 27,
		items: []
	};
	for(let l of alpha) {
		debug('Letter', l);
		list.items.push({title: l});
	}
	return list;
}



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
						thumbnailUri: this.controller.getKodiImage(this.id, item.thumbnail, 80),
						actionIdentifier: 'Player.GoTo 0 ' + index++
					};
					list.addListItem(params_item);
				}
				resolve(list);
			});
		}
	});
}
*/

/*
 *	Builds lists with detailed info for currently playing media item
 */
getNowPlaying(params_in) {
	debug('getNowPlaying()', params_in);
	var s = this.client.state;
	var media_item_type = s.get('media.item.type');
	var params = {
		playlist_id: undefined,
		properties: undefined,
		limits: {
			start: params_in.start,
			end: params_in.end,
		}
	};
	var list_options = {
		title: 'Currently Playing',
		offset: params_in.offset,
		limit: params_in.limit
	};
	debug('TYPE', media_item_type);
	return new BluePromise((resolve, reject) => {
		var list = neeoapi.buildBrowseList(list_options);
		var i = s.get('media.item');
		switch(media_item_type) {
			case 'song':
				try {
					list.addListHeader(i.title);
					var o = null;
					var artist_thumb = i.art['artist.thumb'];

					o = {title: i.artist.join(', ')};
					if(artist_thumb) o.thumbnailUri = this.client.getKodiImage(artist_thumb, 215)
					list.addListItem(o);

					if(i.album) {
						o = {
							title: i.album,
							label: i.albumartist.join(', '),
						};
						if(i.thumbnail) o.thumbnailUri = this.client.getKodiImage(i.thumbnail, 215)
						list.addListItem(o);
					}
					if(i.lyrics) {
						list.addListInfoItem({
				     title: 'Show lyrics',
				     text: i.lyrics,
				     affirmativeButtonText: 'OK'
	   	 			});
					}
					o = {
						thumbnailUri: this.client.getKodiImage(i.thumbnail, 215)
					};
					list.addListTiles([o, o]);
					debug('BRAK');
				} catch(error) {
					debug('Caught', error);
				}
				break;
			case 'episode':
				list.addListHeader('Episode');
				break;
			case 'movie':
				list.addListHeader('Movie');
				break;
			default:
				list.addListHeader('No information available');
				break;
		}
		debug('RESOLV');
		resolve(list);
	});
}

	/*
	 *	Builds lists for the QUEUE directory
	 */
	getQueue(params_in) {
		// Caveat: This is assuming that all playlist items are the same media type
		debug('getQueue()', params_in);
		var s = this.client.state;
		var media_type = s.get('media.type');
		var media_item_type = s.get('media.item.type');
		s.updatePlayer();
		s.updatePlaylists();
//		s.updatePlaylists();

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
//		list.setListTitle(listOptions.title);
		debug('TYPE', media_type, media_item_type);
		return new BluePromise((resolve, reject) => {
			var list = neeoapi.buildBrowseList(listOptions);
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
							thumbnailUri: this.client.getKodiImage(item.thumbnail, 215),
							actionIdentifier: 'Internal/goToPlaylistItem/0/' + index++
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
							thumbnailUri: this.client.getKodiImage(item.thumbnail, 215),
							actionIdentifier: 'Internal/goToPlaylistItem/1/' + index++
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
						thumbnailUri: this.client.getKodiImage(s.media.item.thumbnail, 215)
					};
/*
					let conf = {
						thumbnailUri: this.controller.getKodiImage(this.id, s.media.item.thumbnail, 215),
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
								thumbnailUri: this.client.getKodiImage(item.thumbnail, 215),
								actionIdentifier: 'Internal/goToPlaylistItem/1/' + index++
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
