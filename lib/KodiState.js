'use strict';

/*
 *	KodiState: Maintains data describing the state of a Kodi instance.
 *
 *		Info labels and booleans:
 *			https://kodi.wiki/view/InfoLabels
 *			https://codedocs.xyz/xbmc/xbmc/modules__infolabels_boolean_conditions.html
 */


const debug = require('debug')('neeo-driver-kodi:KodiState');
const BluePromise = require('bluebird');
const conf = require('./Config');
const dotProp = require('dot-prop');

//const BluePromise = require('bluebird');

module.exports = class KodiState {

	constructor(id, client) {
		this.id = id;
		this.client = client;
		this.debug = debug.extend(client.name);
		this.debugData = this.debug.extend('data');
		this.debug('CONSTRUCTOR', id);

		this.controller = this.client.controller;
		this.state = {
			isPlaying: undefined,
			hasMedia: undefined,
			volume: undefined,
			muted: false,
			previousWindow: undefined,
			currentWindow: undefined,
			activePlayer: undefined
		}
		this.media = {
			title: 'N/A',
			caption: 'N/A',
			description: 'N/A',
			genre: ['N/A'],
			type: 'N/A',
			subtype: 'N/A',
			year: 'N/A',
			plot: undefined,
			plotoutline: undefined,
			tagline: undefined,
			item: {}
		}
		this.players = {};
		this.playlists = {};
		this.event_callbacks = {};
		// KodiClient will call update() to set values, as soon as the API connection is up
		//console.log(this);
	}

	toString() {
		var str = 'KodiState ' + this.id + '\n\t';
		var a = [];
		for (let [key, value] of Object.entries(this.state)) {
			a.push('' + key + ': ' + value);
		}
		str += 'STATE: ' + a.join(', ');
		str += '\n\t';
		var a = [];
		for (let [key, value] of Object.entries(this.media)) {
			a.push('' + key + ': ' + value);
		}
		str += 'MEDIA: ' + a.join(', ');
		return str;
	}

	toJSON() {
		return JSON.stringify({id: this.id, state: this.state, media: this.media, players: this.players, playlists: this.playlists}, null, 2);
	}

	getCurrentWindow() {
		this.debug('getCurrentWindow');
	}

	get(key) {
		return dotProp.get(this, key, undefined);
	}

	getState(key) {
		try {
			return this.state[key];
		} catch(e) {
			return undefined;
		}
	}

	getMedia(key) {
		try {
			return this.media[key];
		} catch(e) {
			return undefined;
		}
	}

	/*
	 *	Update everything
	 */
	update() {
		this.debug('update()');
		this.updateApplication(['volume', 'muted', 'name', 'version']);
		this.updateGUI();
		this.updatePlayer();
		this.updatePlaylists();
//		console.log(this.toString());
	}

	updateApplication(props_in) {
		this.debug('updateApplication()');
		let props = ['volume', 'muted'];
		if(props_in) {
			props = props_in;
		}
		return new BluePromise((resolve, reject) => {
			this.client.send('Application.GetProperties', {properties: props} ).then( reply => {
				this.debugData('updateApplication() DATA', reply);
				for(var prop in reply) {
					this.state[prop] = reply[prop];
				}
				this.controller.sendComponentUpdate(this.id, 'SLIDER_VOLUME', this.state.volume);
				this.controller.sendComponentUpdate(this.id, 'SWITCH_MUTE', this.state.muted);
				resolve(reply);
			});
		});
	}

	updateGUI() {
		this.debug('updateGUI()');
		this.client.send('GUI.GetProperties', {properties: ['currentwindow']} ).then( reply => {
			this.debugData('updateGUI() DATA', reply);
			let window_id = reply.currentwindow.id;
			if(window_id != this.state.currentWindow) {
				this.state.previousWindow = this.state.currentWindow;
				this.state.currentWindow = window_id;
			}
			// FIXME: Temporary record of actual return values
			let seen = conf.get('seen') || {};
			let cw = seen.currentwindow || {};
			cw[reply.currentwindow.id] = reply.currentwindow.label;
			seen.currentwindow = cw;
			conf.set('seen', seen);
		});
//		console.log(this.toString());
	}

	// Updates info for all playlists
	updatePlaylists() {
		this.debug('updatePlaylists()');
		this.client.send('Playlist.GetPlaylists', {}).then((reply) => {
			for(let playlist of reply) {
				let playlist_id = parseInt(playlist.playlistid);
				this.playlists[playlist_id] = playlist;
			}
		}).then(() => {
			for(let playlist_id in this.playlists) {
				this.client.send('Playlist.GetProperties', {playlistid: parseInt(playlist_id), properties: ['type', 'size']}).then((reply) => {
					this.playlists[playlist_id].type = reply.type;
					this.playlists[playlist_id].size = reply.size;
				});
			}
		});
	}

	// Updates info for active playlist
	updatePlaylist() {
		this.debug('updatePlaylist()');
		if(this.players[this.state.activePlayer]) {
			let type = this.players[this.state.activePlayer].type;
			for(let playlist_id in this.playlists) {
				if(this.playlists[playlist_id].type == type) {
					this.client.send('Playlist.GetProperties', {playlistid: parseInt(playlist_id), properties: ['type', 'size']}).then((reply) => {
						this.playlists[playlist_id].type = reply.type;
						this.playlists[playlist_id].size = reply.size;
					});
				}
			}
		}
	}

	updatePlayer() {
		this.debug('updatePlayer()');
		return new BluePromise((resolve, reject) => {
			try {
				this.client.send('XBMC.GetInfoBooleans', {booleans: ['Player.HasMedia', 'Player.HasAudio', 'Player.HasVideo', 'Player.Playing']}).then( (reply) => {
					// Player.HasAudio Player.HasVideo System.HasPVRAddon System.CanPowerDown System.CanSuspend System.CanHibernate
					this.debugData('updatePlayer() DATA', reply);
					if(this.state.isPlaying != reply['Player.Playing']) {
						this.state.isPlaying = reply['Player.Playing'];
						this.client.sendComponentUpdate(this.id, 'SWITCH_PLAYING', this.state.isPlaying);
					}
					this.state.hasMedia = reply['Player.HasMedia'];
					this.state.hasAudio = reply['Player.HasAudio'];
					this.state.hasVideo = reply['Player.HasVideo'];
					// infolabels Player.Icon Player.Art(type) System.Language
					if(this.state.hasMedia) {
						this.client.send('Player.GetActivePlayers').then( (reply) => {
							// Caveat: We are only handling one active player
							let player = reply[0];
							if(!player || player == undefined) {
								// All players stopped?
								resolve(false);
							}
							this.players[player.playerid] = player;
							this.debug('updatePlayer() active player', player.playerid);
							this.state.activePlayer = player.playerid;
							this.debug('Active player', this.state.activePlayer);
							this.client.send('Player.GetProperties', {playerid: this.state.activePlayer, properties: ['audiostreams', 'currentaudiostream', 'type', 'partymode', 'speed', 'time', 'percentage', 'totaltime', 'playlistid', 'position', 'repeat', 'shuffled', 'subtitleenabled', 'currentsubtitle', 'subtitles', 'live']}).then( (reply) => {
								for(var prop in reply) {
									this.media[prop] = reply[prop];
								}
							});
							let params = null;
							switch(player.type) {
								case 'audio':
									params = {playerid: this.state.activePlayer, properties: ["title", "artist", "albumartist", "genre", "year", "rating", "album", "track", "duration", "lyrics", "playcount", "lastplayed", "thumbnail", "file", "artistid", "albumid", "disc", "tag", "art", "genreid", "displayartist", "albumartistid", "description", "theme", "mood", "style", "albumlabel", "sorttitle", "uniqueid", "hidden", "locked", "compilation", "releasetype", "albumreleasetype", "contributors", "displaycomposer", "displayconductor", "displayorchestra", "displaylyricist", "userrating"]};
									break;
								case 'video':
									params = {playerid: this.state.activePlayer, properties: ["title", "artist", "albumartist", "genre", "year", "rating", "album", "track", "duration", "lyrics", "playcount", "director", "trailer", "tagline", "plot", "plotoutline", "originaltitle", "lastplayed", "mpaa", "country", "premiered", "productioncode", "runtime", "set", "showlink", "firstaired", "season", "episode", "showtitle", "thumbnail", "file", "artistid", "albumid", "tvshowid", "setid", "disc", "tag", "art", "genreid", "displayartist", "albumartistid", "description", "theme", "mood", "style", "albumlabel", "sorttitle", "episodeguide", "uniqueid", "channel", "channeltype", "hidden", "locked", "channelnumber", "starttime", "endtime", "specialsortseason", "specialsortepisode", "compilation", "releasetype", "albumreleasetype", "contributors", "displaycomposer", "displayconductor", "displayorchestra", "displaylyricist", "userrating"]};
									break;
							}
//							this.debug('Player.GetItem', params);
							this.client.send('Player.GetItem', params).then( (reply) => {
								for(var prop in reply.item) {
									this.media.item[prop] = reply.item[prop];
								}
								if(reply.item.thumbnail) {
									let url = null;
									url = this.controller.getImageUrl(this.id, 'IMAGE_NOW_PLAYING_THUMBNAIL_LARGE');
									this.client.sendComponentUpdate(this.id, 'IMAGE_NOW_PLAYING_THUMBNAIL_LARGE', url);
									url = this.controller.getImageUrl(this.id, 'IMAGE_NOW_PLAYING_THUMBNAIL_SMALL');
									this.client.sendComponentUpdate(this.id, 'IMAGE_NOW_PLAYING_THUMBNAIL_SMALL', url);
								}
								BluePromise.join(
									this.updateMediaCaption(),
									this.updateMediaDescription(),
									function() { resolve(true) }
								);
							});
						});

					} else {
		//				this.media.title = 'N/A';
		//				this.media.description = 'N/A';
		//				this.media.type = 'N/A';
		//				this.media.subtype = 'N/A';
		//				this.media.genre = ['N/A'];
						// this.media.plot = undefined;
						// this.media.plotoutline = undefined;
						// this.media.tagline = undefined;
					}
					console.log(this.toString());
		//			console.log(this.media);
				});
			} catch(error) {
				this.debug('updatePlayer() ERROR', error);
				reject(error);
			}
		});
	}

	updateMediaCaption() {
		var s = 'Unknown';
		var a = [];
		if(this.state.hasMedia) {
			s = '';
			switch(this.media.item.type) {
				case 'song':
					if(this.media.item.track) a.push(this.media.item.track);
					if(this.media.item.artist) a.push(this.media.item.artist.join(', '));
					if(this.media.item.title) a.push(this.media.item.title);
					s = a.join(' - ');
					break;
				case 'movie':
					s += this.media.item.label;
					s += ' (' + this.media.item.year + ')';
					break;
				default:
					s = this.media.item.label || 'N/A';
			}
		} else {
			s = 'N/A';
		}
		this.debug('updateMediaCaption()', s);
		if(s != this.media.caption) {
			this.media.caption = s;
			this.client.sendComponentUpdate(this.id, 'LABEL_NOW_PLAYING_CAPTION', s);
		}
		return s;
	}

	updateMediaDescription() {
		var s = 'Unknown';
		var a = [];
		if(this.state.hasMedia) {
			s = '';
			switch(this.media.item.type) {
				case 'song':
						if(this.media.item.album) a.push(this.media.item.album);
						if(this.media.item.year) a.push(this.media.item.year);
						s = a.join(' - ');
					break;
				case 'movie':
					let parts = [];
					if(this.media.item.country) parts.push(this.media.item.country);
					if(this.media.item.genre.length) parts.push(this.media.item.genre.join(', '));
					if(this.media.item.runtime) parts.push(Math.floor(this.media.item.runtime/60) + ' Minutes');
					if(this.media.item.tagline) parts.push(this.media.item.tagline);
					s = parts.join(' - ');
					break;
				default:
					this.debug('updateMediaDescription() falling back to default', this.media.item.type);
					s = this.media.item.type || 'N/A';
			}
		} else {
			s = 'N/A';
		}
		this.debug('updateMediaDescription()', s);
		if(s != this.media.description) {
			this.media.description = s;
			this.client.sendComponentUpdate(this.id, 'LABEL_NOW_PLAYING_DESCRIPTION', s);
		}
		return s;
	}

	// Add a callback for the next event
	addEventCallback(event, callback) {
		this.debug('queueEvent()', event);
		if(!this.event_callbacks[event]) {
			this.event_callbacks[event] = [];
		}
		this.event_callbacks[event].push(callback);
		this.debug('CALLBACKS', this.event_callbacks);
	}


	handleEvent(event, params) {
		// Run any pending callbacks
		if(this.event_callbacks[event] && this.event_callbacks[event].length) {
			while(this.event_callbacks[event].length) {
				let f = this.event_callbacks[event].shift();
				f();
			}
			return;
		}
		// Normal handling
		switch(event) {
			case 'Application.OnVolumeChanged':
				this.debug('onVolumeChanged', params);
				let muted = this.state.muted = params.data.muted;
				let volume = this.state.volume = params.data.volume;
				this.controller.sendComponentUpdate(this.id, 'SLIDER_VOLUME', volume);
				this.controller.sendComponentUpdate(this.id, 'SWITCH_MUTE', muted);
				break;
			case 'Player.OnAVStart':
			case 'Player.OnPlay':
				this.debug('onPlay', params);
				this.state.isPlaying = true;
				this.client.sendComponentUpdate(this.id, 'SWITCH_PLAYING', this.state.isPlaying);
				// This should fire after Kodi has actually loaded an item and started playing
				this.addEventCallback('Player.OnAVChange', () => {
					this.updatePlayer().then(() => {
						this.updatePlaylist();
						this.updateGUI();
					});
				});
				break;
			case 'Player.OnStop':
				this.debug('onStop', params);
				this.state.isPlaying = false;
				this.client.sendComponentUpdate(this.id, 'SWITCH_PLAYING', this.state.isPlaying);
				this.updateGUI();
				this.updatePlayer();
				break;
			case 'Player.OnPause':
				this.debug('onPause', params);
				this.state.isPlaying = false;
				this.client.sendComponentUpdate(this.id, 'SWITCH_PLAYING', this.state.isPlaying);
				break;
			case 'Player.OnResume':
				this.debug('onResume', params);
				this.state.isPlaying = true;
				this.client.sendComponentUpdate(this.id, 'SWITCH_PLAYING', this.state.isPlaying);
				break;
			case 'Player.OnAVChange':
				this.updatePlayer();
				break;
			case 'Playlist.OnClear':
			case 'Playlist.OnAdd':
			case 'Playlist.OnRemove':
				this.updatePlaylist();
				break;
			case 'Input.OnInputRequested':
			case 'System.OnQuit':
			case 'System.OnRestart':
			default:
				// FIXME
				let seen = conf.get('seen.events') || {};
				seen[event] = event;
				conf.set('seen.events', seen);
		}
	}

/*
VideoPlayer.Content(files)
VideoPlayer.Content(movies)
VideoPlayer.Content(episodes)
VideoPlayer.Content(musicvideos)
VideoPlayer.Content(livetv)
*/

}
