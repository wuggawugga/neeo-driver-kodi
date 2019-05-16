'use strict';

/*
 *	KodiLibrary: Maintains Kodi library information
 */

const debug = require('debug')('neeo-driver-kodi:KodiLibrary');
const BluePromise = require('bluebird');
//const neeoapi = require('neeo-sdk');


module.exports = class KodiLibrary {

  constructor(device_id, client) {
    this.id = device_id;
    this.client = client;
    this.controller = this.client.controller;
    this.musicGenres = {_: []};
    let alpha = 'abcdefghijklmnopqrstuvwxyz'.split('');
    let l;
    for(l of alpha) {
      this.musicGenres[l] = [];
    }
//    setTimeout(() => {this.getMusicGenres()}, 4000);
  }

  listAction(directory_id, params) {
    debug('listAction()', directory_id, params);
    try {
      let tokens = params.actionIdentifier.split('/');
      let method = tokens[1];
      let params = tokens[2];
      if(tokens.length > 3) params = tokens.slice(2);
      return this[method](params);
    } catch(error) {
      debug('Caught', error);
    }
  }


  getAlbumsByArtist(path_in, params_in) {
    debug('getAlbumsByArtist()', path_in, params_in);
    return new BluePromise((resolve, reject) => {
      try {
        const artist_id = path_in[1];
  			var path = path_in[0];
        let params = {properties: ["title", "description", "artist", "genre", "theme", "mood", "style", "type", "rating", "votes", "userrating", "year", "thumbnail", "playcount", "displayartist", "compilation", "releasetype"], limits: {start: params_in.start, end: params_in.end}, filter: {artistid: parseInt(artist_id)}, sort: {method: "title"}};
        debug(params);
        this.client.send('AudioLibrary.GetAlbums', params)
        .then((response) => {
          debug(response);
          var list_out = {
            title: 'Albums',
            total_items: response.limits.total,
            path: path,
            items: []
          };
          let key = Object.keys(response)[0];
          for(var item_in of response.albums) {
            var item_out = {
      				title: item_in.title,
              label: item_in.displayartist,
              browseIdentifier: '/music/album/' + item_in.albumid,
				      thumbnailUri: this.controller.fetchKodiImage(this.id, item_in.thumbnail, 80)
      			};
            list_out.items.push(item_out);
          }
          resolve(list_out);
        });
      } catch(error) {
        debug('ERROR', error);
        reject('Error');
      }
    });
  }

  getAlbum(path_in, params_in) {
    debug('getAlbumsByArtist()', path_in, params_in);
    return new BluePromise((resolve, reject) => {
      try {
        const album_id = path_in[1];
  			var path = path_in[0];
        let params = {
          properties: ["title", "artist", "albumartist", "genre", "year", "rating", "album", "track", "duration", "comment", "lyrics", "playcount", "fanart", "thumbnail", "file", "albumid", "lastplayed", "disc", "genreid", "artistid", "displayartist", "albumartistid", "albumreleasetype", "dateadded", "votes", "userrating", "mood", "contributors", "displaycomposer", "displayconductor", "displayorchestra", "displaylyricist"],
          filter: {albumid: parseInt(album_id)}, limits: {start: params_in.start, end: params_in.end}, sort: {method: "title"}};
        debug(params);
        this.client.send('AudioLibrary.GetSongs', params)
        .then((response) => {
          debug(response);
          var list_out = {
            title: 'Album',
            total_items: response.limits.total,
            path: path,
            items: []
          };
          for(var item_in of response.songs) {
            var item_out = {
      				title: item_in.title,
              label: item_in.displayartist,
				      thumbnailUri: this.controller.fetchKodiImage(this.id, item_in.thumbnail, 80),
              actionIdentifier: 'API/Player.Open/' + item_in.songid
      			};
            list_out.items.push(item_out);
          }
          resolve(list_out);
        });
      } catch(error) {
        debug('ERROR', error);
        reject('Error');
      }
    });
  }


	getMusicGenres() {
    debug('getMusicGenres()');
    try {
      this.client.send('AudioLibrary.GetGenres', {properties: ["title", "thumbnail"], limits: {start: 0, end: 0}, sort: {method: "title"}})
  		.then((response) => {
        var genre, key, char;
        for(genre of response.genres) {
          key = genre.title.charAt(0).toLowerCase();
          char = genre.title.charCodeAt(0);
          if(char < 65 || char > 122) key = '_';
          if(this.musicGenres[key]) this.musicGenres[key].push(genre);
        }
      }).then(() => {
        for(let key in this.musicGenres) {
          if(this.musicGenres[key].length == 0) {
            delete this.musicGenres[key];
          }
        }
      });
    } catch(error) {
    }
	}


 }
