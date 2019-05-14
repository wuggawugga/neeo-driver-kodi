'use strict';

/*
 *	KodiLibrary: Maintains Kodi library information
 */

const debug = require('debug')('neeo-driver-kodi:KodiLibrary');

module.exports = class KodiLibrary {

  constructor(device_id, client) {
    this.id = device_id;
    this.client = client;
    this.musicGenres = {_: []};
    let alpha = 'abcdefghijklmnopqrstuvwxyz'.split('');
    let l;
    for(l of alpha) {
      this.musicGenres[l] = [];
    }
    setTimeout(() => {this.getMusicGenres()}, 4000);
  }

  getAlbumsByArtist(artist_id) {
    debug('getAlbumsByArtist()', artist_id);
    try {
      this.client.send('AudioLibrary.GetAlbums', {properties: ["title", "description", "artist", "genre", "theme", "mood", "style", "type", "rating", "votes", "userrating", "year", "thumbnail", "playcount", "displayartist", "compilation", "releasetype"], limits: {start: 0, end: 0}, filter: {artistdi: artist_id}, sort: {method: "title"}})
      .then((response) => {
        debug(response);
      });
    } catch(error) {
      debug('ERROR', error);
    }


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
