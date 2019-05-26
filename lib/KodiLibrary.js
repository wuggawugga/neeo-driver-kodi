'use strict';

/*
 *	KodiLibrary: Maintains Kodi library information
 */

const debug = require('debug')('neeo-driver-kodi:KodiLibrary');
const BluePromise = require('bluebird');
const receptacle = require('./Receptacle').meta_cache;
const md5 = require('./functions').md5;
const conf = require('./Config');

//const neeoapi = require('neeo-sdk');


module.exports = class KodiLibrary {

  constructor(device_id, client) {
    this.id = device_id;
    this.client = client;
    this.debug = debug.extend(client.name);
    this.debugData = this.debug.extend('data');
    this.controller = this.client.controller;
    this.image_cache_enabled = conf.get('image_cache_enabled');
    this.musicGenres = {};
    // this.musicGenres = {_: []};
    // let alpha = 'abcdefghijklmnopqrstuvwxyz'.split('');
    // let l;
    // for(l of alpha) {
    //   this.musicGenres[l] = [];
    // }
//    this.getMusicGenres();
    setTimeout(() => {this.getMusicGenres()}, 4000);
  }

  listAction(directory_id, params) {
    this.debug('listAction()', directory_id, params);
    try {
      let tokens = params.actionIdentifier.split('/');
      let method = tokens[1];
      let params = tokens[2];
      if(tokens.length > 3) params = tokens.slice(2);
      return this[method](params);
    } catch(error) {
      this.debug('Caught', error);
    }
  }

  getMusicGenres() {
    this.debug('getMusicGenres()');
    try {
      return new BluePromise((resolve, reject) => {
        this.client.send('AudioLibrary.GetGenres', {properties: ["title", "thumbnail"], limits: {start: 0, end: 0}, sort: {method: "title"}})
        .then((response) => {
          let genre, key, char;
          for(genre of response.genres) {
            key = genre.genreid;
            this.musicGenres[key] = genre;
          }
          this.debug(Object.entries(this.musicGenres).length, 'music genres loaded');
        });
      });
    } catch(error) {
      this.debug('ERROR', error);
    }
  }

  getMusicGenre(genre_id) {
    this.debug('getMusicGenre()', genre_id);
    try {
      if(this.musicGenres[genre_id]) {
        this.debug('OUT', this.musicGenres[genre_id]);
        return this.musicGenres[genre_id];
      } else {
        // FIXME: CBA
      }
    } catch(error) {
      this.debug('ERROR', error);
    }
  }

  getArtists(params_in) {
    this.debug('getArtists()', params_in);
    return new BluePromise((resolve, reject) => {
      let key = 'getArtists-'+md5(JSON.stringify(params_in));
      if(receptacle.has(key)) {
        this.debug('Cache hit');
        resolve(receptacle.get(key));
      } else {
        let params_out = { properties: ["description", "style", "mood", "genre", "born", "died", "formed", "disbanded", "yearsactive", "art", "thumbnail", "compilationartist", "isalbumartist", "dateadded"] };
        if(params_in.filter) params_out.filter = params_in.filter;
        if(params_in.limits) params_out.limits = params_in.limits;
        if(params_in.sort) {
          params_out.sort = params_in.sort;
        } else {
          params_out.sort = { method: 'artist' };
        }
        this.client.send('AudioLibrary.GetArtists', params_out).then((response) => {
          receptacle.set(key, response);
          for(let artist of response.artists) {
            key = 'artist-'+artist.artistid;
            receptacle.set(key, artist);
          }
          resolve(response);
        });
      }
    });
  }

  getArtistDetails(artist_id) {
    this.debug('getArtistDetails()', artist_id);
    return new BluePromise((resolve, reject) => {
      let key = 'artist-'+artist_id;
      if(receptacle.has(key)) {
        this.debug('Cache hit');
        resolve(receptacle.get(key));
      } else {
        let params_out = { artistid: parseInt(artist_id), properties: ["description", "style", "mood", "genre", "born", "died", "formed", "disbanded", "yearsactive", "art", "thumbnail", "compilationartist", "isalbumartist", "dateadded"] };
        this.client.send('AudioLibrary.GetArtistDetails', params_out).then((response) => {
          if(response.artistdetails) {
            receptacle.set(key, response.artistdetails);
            resolve(response.artistdetails);
          } else {
            reject('Artist not found');
          }
        });
      }
    });
  }

  getAlbums(params_in) {
    this.debug('getAlbums()', params_in);
    return new BluePromise((resolve, reject) => {
      let key = 'getAlbums-'+md5(JSON.stringify(params_in));
      if(receptacle.has(key)) {
        this.debug('Cache hit');
        resolve(receptacle.get(key));
      } else {
        let params_out = { properties: ["title", "description", "artist", "artistid", "genre", "theme", "mood", "style", "type", "rating", "votes", "userrating", "year", "thumbnail", "playcount", "displayartist", "compilation", "releasetype"] };
        if(params_in.filter) params_out.filter = params_in.filter;
        if(params_in.limits) params_out.limits = params_in.limits;
        if(params_in.sort) {
          params_out.sort = params_in.sort;
        } else {
          params_out.sort = { method: 'title' };
        }
        this.client.send('AudioLibrary.GetAlbums', params_out).then((response) => {
          this.debug('KEY', key);
          receptacle.set(key, response);
          let i = 0;
          for(let album of response.albums) {
            i++;
            key = 'album-'+album.albumid;
            receptacle.set(key, album);
          }
          debug('Returning', i, 'items');
          resolve(response);
        });
      }
    });
  }

  getAlbumDetails(album_id) {
    this.debug('getAlbumDetails()', album_id);
    return new BluePromise((resolve, reject) => {
      let key = 'album-'+album_id;
      if(receptacle.has(key)) {
        this.debug('Cache hit');
        resolve(receptacle.get(key));
      } else {
        let params_out = { albumid: parseInt(album_id), properties: ["title", "description", "art", "artist", "artistid", "genre", "theme", "mood", "style", "type", "rating", "votes", "userrating", "year", "thumbnail", "playcount", "displayartist", "compilation", "releasetype"] };
        this.client.send('AudioLibrary.GetAlbumDetails', params_out).then((response) => {
          if(response.albumdetails) {
            receptacle.set(key, response.albumdetails);
            resolve(response.albumdetails);
          } else {
            reject('Album not found');
          }
        });
      }
    });
  }

  getSongs(params_in) {
    this.debug('getSongs()', params_in);
    return new BluePromise((resolve, reject) => {
      let key = 'getSongs-'+md5(JSON.stringify(params_in));
      if(receptacle.has(key)) {
        this.debug('Cache hit');
        resolve(receptacle.get(key));
      } else {
        let params_out = { properties: ["title", "artist", "albumartist", "genre", "year", "rating", "album", "track", "duration", "comment", "lyrics", "playcount", "fanart", "thumbnail", "file", "albumid", "lastplayed", "disc", "genreid", "artistid", "displayartist", "albumartistid", "albumreleasetype", "dateadded", "votes", "userrating", "mood", "contributors", "displaycomposer", "displayconductor", "displayorchestra", "displaylyricist"] };
        if(params_in.filter) params_out.filter = params_in.filter;
        if(params_in.limits) params_out.limits = params_in.limits;
        if(params_in.sort) {
          params_out.sort = params_in.sort;
        } else {
          params_out.sort = { method: 'title' };
        }
        this.client.send('AudioLibrary.GetSongs', params_out).then((response) => {
          receptacle.set(key, response);
          for(let song of response.songs) {
            key = 'song-'+song.songid;
            receptacle.set(key, song);
          }
          resolve(response);
        });
      }
    });
  }

  getSongDetails(song_id) {
    this.debug('getSongDetails()', song_id);
    return new BluePromise((resolve, reject) => {
      let key = 'song-'+song_id;
      if(receptacle.has(key)) {
        this.debug('Cache hit');
        resolve(receptacle.get(key));
      } else {
        let params_out = { songid: parseInt(song_id), properties: ["title", "art", "artist", "albumartist", "genre", "year", "rating", "album", "track", "duration", "comment", "lyrics", "playcount", "fanart", "thumbnail", "file", "albumid", "lastplayed", "disc", "genreid", "artistid", "displayartist", "albumartistid", "albumreleasetype", "dateadded", "votes", "userrating", "mood", "contributors", "displaycomposer", "displayconductor", "displayorchestra", "displaylyricist"] };
        this.client.send('AudioLibrary.GetSongDetails', params_out).then((response) => {
          if(response.songdetails) {
            receptacle.set(key, response.songdetails);
            resolve(response.songdetails);
          } else {
            reject('Song not found');
          }
        });
      }
    });
  }

  GetTVShows(params_in) {
    this.debug('GetTVShows()', params_in);
    return new BluePromise((resolve, reject) => {
      let params_out = { properties: ["title", "genre", "year", "rating", "plot", "studio", "mpaa", "cast", "playcount", "episode", "premiered", "lastplayed", "fanart", "thumbnail", "file", "originaltitle", "sorttitle", "episodeguide", "season", "watchedepisodes", "tag", "art", "userrating", "ratings", "runtime", "uniqueid"] };
      if(params_in.filter) params_out.filter = params_in.filter;
      if(params_in.limits) params_out.limits = params_in.limits;
      if(params_in.sort) {
        params_out.sort = params_in.sort;
      } else {
        params_out.sort = { method: 'title' };
      }
      this.client.send('VideoLibrary.GetTVShows', params_out).then((response) => {
        // let k = Object.keys(response)[0];
        // for(let album of response[k]) {
        //   let key = 'album-'+album.albumid;
        //   receptacle.set(key, album);
        // }
        resolve(response);
      });
    });
  }




/*
  getAlbumsByArtist(route_in, params_in) {
    this.debug('getAlbumsByArtist()', route_in, params_in);
    return new BluePromise((resolve, reject) => {
      try {
        const artist_id = route_in[1];
  			var path = route_in[0];
        let params = {properties: ["title", "description", "artist", "genre", "theme", "mood", "style", "type", "rating", "votes", "userrating", "year", "thumbnail", "playcount", "displayartist", "compilation", "releasetype"], limits: {start: params_in.start, end: params_in.end}, filter: {artistid: parseInt(artist_id)}, sort: {method: "title"}};
        this.debug(params);
        this.client.send('AudioLibrary.GetAlbums', params)
        .then((response) => {
          this.debug(response);
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
				      thumbnailUri: this.controller.getKodiImage(this.id, item_in.thumbnail, 100)
      			};
            list_out.items.push(item_out);
          }
          resolve(list_out);
        });
      } catch(error) {
        this.debug('ERROR', error);
        reject('Error');
      }
    });
  }


  getAlbum(route_in, params_in) {
    this.debug('getAlbumsByArtist()', route_in, params_in);
    return new BluePromise((resolve, reject) => {
      try {
        const album_id = route_in[1];
  			var path = route_in[0];
        let params = {
          properties: ["title", "artist", "albumartist", "genre", "year", "rating", "album", "track", "duration", "comment", "lyrics", "playcount", "fanart", "thumbnail", "file", "albumid", "lastplayed", "disc", "genreid", "artistid", "displayartist", "albumartistid", "albumreleasetype", "dateadded", "votes", "userrating", "mood", "contributors", "displaycomposer", "displayconductor", "displayorchestra", "displaylyricist"],
          filter: {albumid: parseInt(album_id)}, limits: {start: params_in.start, end: params_in.end}, sort: {method: "title"}};
        this.debug(params);
        this.client.send('AudioLibrary.GetSongs', params)
        .then((response) => {
          this.debug(response);
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
				      thumbnailUri: this.controller.getKodiImage(item_in.thumbnail, 100),
              // TODO:
              //  * Cache album track data
              //  * Clear playlist
              //  * Add album Tracks
              //  * Play selected track
              actionIdentifier: 'Internal/playAlbumTrack/' + item_in.songid
      			};
            list_out.items.push(item_out);
          }
          resolve(list_out);
        });
      } catch(error) {
        this.debug('ERROR', error);
        reject('Error');
      }
    });
  }

  */



 }
