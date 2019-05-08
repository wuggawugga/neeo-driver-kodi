'use strict';

/*
 *	KodiState: Stores and maintains data describing the state of a Kodi instance.
 *
 *		Info labels and booleans:
 *			https://kodi.wiki/view/InfoLabels
 *			https://codedocs.xyz/xbmc/xbmc/modules__infolabels_boolean_conditions.html
 */


const debug = require('debug')('neeo-driver-kodi:KodiState');
const debugData = debug.extend('data');
const conf = require('./Configstore');
//const BluePromise = require('bluebird');

module.exports = class KodiState {

	constructor(id, client) {
		debug('CONSTRUCTOR', id);
		this.id = id;
		this.client = client;
		this.state = {
			isPlaying: undefined,
			hasMedia: undefined,
			volume: undefined,
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
		// KodiClient will call update() to set values, as soon as the API connection is up
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

	getCurrentWindow() {
		debug('getCurrentWindow');
	}

	// This may be useless...
	getState(key) {
		if(this.state[key]) {
			return this.state[key];
		}
		return undefined;
	}

	getMedia(key) {
		if(this.media[key]) {
			return this.media[key];
		}
		return undefined;
	}

	/*
	 *	Update everything
	 */
	update() {
		debug('update()');
		this.updateGUI();
		this.updatePlayer();
//		console.log(this.toString());
	}

	updateGUI() {
		debug('updateGUI()');
		this.client.send('GUI.GetProperties', {properties: ['currentwindow']} ).then( reply => {
			debugData('updateGUI() DATA', reply);
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

	updatePlayer() {
		debug('updatePlayer()');
		try {
			this.client.send('XBMC.GetInfoBooleans', {booleans: ['Player.HasMedia', 'Player.HasAudio', 'Player.HasVideo', 'Player.Playing']}).then( (reply) => {
				// Player.HasAudio Player.HasVideo System.HasPVRAddon System.CanPowerDown System.CanSuspend System.CanHibernate
				debugData('updatePlayer() DATA', reply);
				this.state.isPlaying = reply['Player.Playing'];
				this.state.hasMedia = reply['Player.HasMedia'];
				this.state.hasAudio = reply['Player.HasAudio'];
				this.state.hasVideo = reply['Player.HasVideo'];
				// infolabels Player.Icon Player.Art(type) System.Language
				if(this.state.hasMedia) {
					this.client.send('Player.GetActivePlayers').then( (reply) => {
						// Caveat: We are only handling one active player
						let player = reply[0];
						if(player == undefined) {
							return;
						}
						this.players[player.playerid] = player;
						this.state.activePlayer = player.playerid;
						debug('Active player', this.state.activePlayer);
						this.client.send('Player.GetProperties', {playerid: this.state.activePlayer, properties: ['audiostreams', 'currentaudiostream', 'type', 'partymode', 'speed', 'time', 'percentage', 'totaltime', 'playlistid', 'position', 'repeat', 'shuffled', 'subtitleenabled', 'currentsubtitle', 'subtitles', 'live']}).then( (reply) => {
							for(var prop in reply) {
								this.media[prop] = reply[prop];
							}
						});

						this.client.send('Player.GetItem', {playerid: this.state.activePlayer, properties: ['album', 'albumartist', 'albumlabel', 'art', 'artist', 'channel', 'channelnumber', 'channeltype', 'comment', 'description', 'displayartist', 'duration', 'endtime', 'episode', 'episodeguide', 'file', 'firstaired', 'genre', 'originaltitle', 'plot', 'plotoutline', 'rating', 'resume', 'runtime', 'season', 'showtitle', 'sorttitle', 'starttime', 'streamdetails', 'tagline', 'thumbnail', 'title', 'track', 'userrating', 'year']}).then( (reply) => {
							for(var prop in reply.item) {
								this.media.item[prop] = reply.item[prop];
							}
							this.updateMediaCaption();
							this.updateMediaDescription();
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
			debug('updatePlayer() ERROR', error);
		}
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
		debug('updateMediaCaption()', s);
		if(s != this.media.caption) {
			this.media.caption = s;
			this.client.sendComponentUpdate(this.id, 'LABEL_NOWPLAYING_CAPTION', s);
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
					s += this.media.item.genre.join(', ');
					s += ' - ' + Math.floor(this.media.item.runtime/60) + ' Minutes';
					if(this.media.item.tagline) {
						s += ' - ' + this.media.item.tagline;
					}
					break;
				default:
					debug('updateMediaDescription() falling back to default', this.media.item.type);
					s = this.media.item.type || 'N/A';
			}
		} else {
			s = 'N/A';
		}
		debug('updateMediaDescription()', s);
		if(s != this.media.description) {
			this.media.description = s;
			this.client.sendComponentUpdate(this.id, 'LABEL_NOWPLAYING_DESCRIPTION', s);
		}
		return s;
	}

	onAVChange(params) {
		this.updatePlayer();
	}

	onPlay(params) {
		switch(params.data.item.type) {
			case 'movie':
			case 'musicvideo':
/*
				this.kodiState.nowPlayingTitle = params.data.item.title;
				this.send("Player.GetItem", { playerid: params.data.player.playerid, properties: ["thumbnail", "title", "year", "genre"] }).then(y => {
					this.kodiState.isPlaying = true;
//									this.kodiState.nowPlayingTitle = tools.movieTitle({ label: y.item.title, year: y.item.year });
					this.kodiState.nowPlayingDescription = y.item.genre.join(", ");
//									this.kodiState.nowPlayingImg = tools.imageToHttp({ ws: kodi }, y.item.thumbnail);
				});
*/
				break;
		}
		this.updateGUI();
//		this.updatePlayer();
	}

	onStop(params) {
		this.updateGUI();
		this.updatePlayer();
	}

	onVolumeChanged(params) {
		this.state.volume = params.data.volume;
	}
/*
VideoPlayer.Content(files)
VideoPlayer.Content(movies)
VideoPlayer.Content(episodes)
VideoPlayer.Content(musicvideos)
VideoPlayer.Content(livetv)
*/

}
