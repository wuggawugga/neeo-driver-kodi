'use strict';

/*
 *	KodiLibrary: Maintains Kodi library information
 */

const debug = require('debug')('neeo-driver-kodi:KodiLibrary');
const BluePromise = require('bluebird');
const neeoapi = require('neeo-sdk');


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
    setTimeout(() => {this.getMusicGenres()}, 4000);
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


  getAlbumsByArtist(artist_id) {
    debug('getAlbumsByArtist()', artist_id);
    return new BluePromise((resolve, reject) => {
      try {
        let params = {properties: ["title", "description", "artist", "genre", "theme", "mood", "style", "type", "rating", "votes", "userrating", "year", "thumbnail", "playcount", "displayartist", "compilation", "releasetype"], limits: {start: 0, end: 0}, filter: {artistid: parseInt(artist_id)}, sort: {method: "title"}};
        debug(params);
        this.client.send('AudioLibrary.GetAlbums', params)
        .then((response) => {
          debug(response);
          const options = {
            title: 'Albums',
            totalMatchingItems: response.limits.total,
//            browseIdentifier: list_in.path,
            offset: response.limits.start,
            limit: response.limits.end - response.limits.start
          };
          var list_out = neeoapi.buildBrowseList(options);
          for(var item_in of response.albums) {
            var params = {
      				title: item_in.title,
              label: item_in.displayartist,
				      thumbnailUri: this.controller.fetchKodiImage(this.id, item_in.thumbnail, 80),
              actionIdentifier: 'KodiLibrary/getAlbum/'+item_in.albumid
      			};
      	    list_out.addListItem(params);
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
