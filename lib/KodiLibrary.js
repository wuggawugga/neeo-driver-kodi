'use strict';

/*
 *	KodiLibrary: Maintains Kodi library information
 */

const debug = require('debug')('neeo-driver-kodi:KodiLibrary');
const BluePromise = require('bluebird');
const receptacle = require('./Receptacle').meta_cache;
const md5 = require('./functions').md5;
const conf = require('./Config');

module.exports = class KodiLibrary {

  constructor(device_id, client) {
    this.id = device_id;
    this.client = client;
    this.debug = debug.extend(client.name);
    this.debugData = this.debug.extend('data');
    this.controller = this.client.controller;
    this.image_cache_enabled = conf.get('image_cache_enabled');
    this.audioGenres = {};
    this.videoGenres = {};
  }

  listAction(directory_id, params) {
    this.debug('listAction()', directory_id, params);
    try {
      let tokens = params.actionIdentifier.split('|');
      let method = tokens[1];
      let params = tokens[2];
      if(tokens.length > 3) params = tokens.slice(2);
      return this[method](params);
    } catch(error) {
      this.debug('Caught', error);
    }
  }

  /*
   *  Audio library
   */

  getAudioGenres(genre_id=null) {
    this.debug('getAudioGenres()', genre_id);
    try {
      return new BluePromise((resolve, reject) => {
        this.client.send('AudioLibrary.GetGenres', {properties: ["title", "thumbnail"], limits: {start: 0, end: 0}, sort: {method: "title"}}).then((response) => {
          if(response.genres && response.genres.length) {
            response.genres.forEach((g) => {this.audioGenres[g.genreid] = g});
            this.debug(Object.entries(this.audioGenres).length, 'audio genres loaded');
            if(genre_id) {
              if(this.audioGenres[genre_id]) {
                resolve(this.audioGenres[genre_id]);
              } else {
                resolve(false);
              }
            } else {
              resolve(true);
            }
          }
        });
      });
    } catch(error) {
      this.debug('ERROR', error);
    }
  }

  getAudioGenre(genre_id) {
    this.debug('getAudioGenre()', genre_id);
    try {
      return new BluePromise((resolve, reject) => {
        if(this.audioGenres[genre_id]) {
          this.debug('OUT', this.audioGenres[genre_id]);
          resolve(this.audioGenres[genre_id]);
        } else {
          this.getAudioGenres(genre_id).then((genre) => {
            resolve(genre);
          });
        }
      });
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

    /*
     *  Audio library
     */

  getVideoGenres(genre_id=null) {
    this.debug('getVideoGenres()', genre_id);
    try {
      return new BluePromise((resolve, reject) => {
        BluePromise.join(
          this.client.send('VideoLibrary.GetGenres', {type: "movie", properties: ["title", "thumbnail"], limits: {start: 0, end: 0}, sort: {method: "title"}}).then((response) => {
            response.genres.forEach((g) => {this.videoGenres[g.genreid] = g});
          }),
          this.client.send('VideoLibrary.GetGenres', {type: "tvshow", properties: ["title", "thumbnail"], limits: {start: 0, end: 0}, sort: {method: "title"}}).then((response) => {
            response.genres.forEach((g) => {this.videoGenres[g.genreid] = g});
          }),
          () => {
            this.debug(Object.entries(this.videoGenres).length, 'video genres loaded');
            if(genre_id) {
              if(this.videoGenres[genre_id]) {
                resolve(this.videoGenres[genre_id]);
              } else {
                resolve(false);
              }
            } else {
              resolve(true);
            }
          }
        )
      });
    } catch(error) {
      this.debug('ERROR', error);
    }
  }

  getVideoGenre(genre_id) {
    this.debug('getVideoGenre()', genre_id);
    try {
      return new BluePromise((resolve, reject) => {
        if(this.videoGenres[genre_id]) {
          this.debug('OUT', this.videoGenres[genre_id]);
            resolve(this.videoGenres[genre_id]);
        } else {
          this.getVideoGenres(genre_id).then((genre) => {
            resolve(genre);
          });
        }
      });
    } catch(error) {
      this.debug('ERROR', error);
    }
  }

  getMovies(params_in) {
    this.debug('getMovies()', params_in);
    return new BluePromise((resolve, reject) => {
      let params_out = { properties: ["title", "genre", "year", "rating", "director", "tagline", "plot", "originaltitle", "lastplayed", "playcount", "mpaa", "country", "runtime", "set", "thumbnail", "sorttitle", "resume", "setid", "dateadded", "tag", "art", "userrating", "ratings", "premiered", "uniqueid"] };
      if(params_in.filter) params_out.filter = params_in.filter;
      if(params_in.limits) params_out.limits = params_in.limits;
      if(params_in.sort) {
        params_out.sort = params_in.sort;
      } else {
        params_out.sort = { method: 'title' };
      }
      this.client.send('VideoLibrary.GetMovies', params_out).then((response) => {
        for(let movie of response.movies) {
          let key = 'movie-' + movie.movieid;
          receptacle.set(key, movie);
        }
        resolve(response);
      });
    });
  }

  getMovieDetails(movie_id) {
    this.debug('getMovieDetails()', movie_id);
    return new BluePromise((resolve, reject) => {
      let key = 'movie-' + movie_id;
      if(receptacle.has(key)) {
        this.debug('Cache hit');
        resolve(receptacle.get(key));
      } else {
        let params_out = { movieid: parseInt(movie_id), properties: ["title", "genre", "year", "rating", "director", "tagline", "plot", "originaltitle", "lastplayed", "playcount", "mpaa", "country", "runtime", "set", "thumbnail", "sorttitle", "resume", "setid", "dateadded", "tag", "art", "userrating", "ratings", "premiered", "uniqueid"] };
        this.client.send('VideoLibrary.GetMovieDetails', params_out).then((response) => {
          if(response.moviedetails) {
            receptacle.set(key, response.moviedetails);
            resolve(response.moviedetails);
          } else {
            reject('Movie not found');
          }
        });
      }
    });
  }


  getTVShows(params_in) {
    this.debug('getTVShows()', params_in);
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

  getTvShowDetails(tvshow_id) {
    this.debug('getTvShowDetails()', tvshow_id);
    return new BluePromise((resolve, reject) => {
      let key = 'tvshow-' + tvshow_id;
      if(receptacle.has(key)) {
        this.debug('Cache hit');
        resolve(receptacle.get(key));
      } else {
        let params_out = { tvshowid: parseInt(tvshow_id), properties: ["title", "genre", "year", "rating", "plot", "studio", "mpaa", "cast", "playcount", "episode", "imdbnumber", "premiered", "votes", "lastplayed", "fanart", "thumbnail", "file", "originaltitle", "sorttitle", "episodeguide", "season", "watchedepisodes", "dateadded", "tag", "art", "userrating", "ratings", "runtime", "uniqueid"] };
        this.client.send('VideoLibrary.GetTVShowDetails', params_out).then((response) => {
          if(response.tvshowdetails) {
            receptacle.set(key, response.tvshowdetails);
            resolve(response.tvshowdetails);
          } else {
            reject('TV show not found');
          }
        });
      }
    });
  }

  getSeasons(tvshow_id) {
    this.debug('getSeasons()', tvshow_id);
    return new BluePromise((resolve, reject) => {
      let params_out = { tvshowid: parseInt(tvshow_id), properties: ["season", "showtitle", "playcount", "episode", "fanart", "thumbnail", "tvshowid", "watchedepisodes", "art", "userrating"] };
      this.client.send('VideoLibrary.GetSeasons', params_out).then((response) => {
        if(response.seasons) {
          let key = null;
          for(let season of response.seasons) {
            key = 'season-' + season.seasonid;
            receptacle.set(key, season);
          }
          resolve(response.seasons);
        }
      });
    });
  }

  getSeasonDetails(season_id) {
    this.debug('getSeasonDetails()', season_id);
    return new BluePromise((resolve, reject) => {
      let key = 'season-' + season_id;
      if(receptacle.has(key)) {
        this.debug('Cache hit');
        resolve(receptacle.get(key));
      } else {
        let params_out = { seasonid: parseInt(season_id), properties: ["season", "showtitle", "playcount", "episode", "fanart", "thumbnail", "tvshowid", "watchedepisodes", "art", "userrating"] };
        this.client.send('VideoLibrary.GetSeasonDetails', params_out).then((response) => {
          if(response.seasondetails) {
            receptacle.set(key, response.seasondetails);
            resolve(response.seasondetails);
          } else {
            debug(response);
          }
        });
      }
    });
  }

  getEpisodes(tvshow_id, season = -1) {
    this.debug('getEpisodes()', tvshow_id, season);
    return new BluePromise((resolve, reject) => {
      let params_out = { tvshowid: parseInt(tvshow_id), season: parseInt(season), properties: ["title", "plot", "votes", "rating", "writer", "firstaired", "playcount", "runtime", "director", "productioncode", "season", "episode", "originaltitle", "showtitle", "cast", "streamdetails", "lastplayed", "fanart", "thumbnail", "file", "resume", "tvshowid", "dateadded", "uniqueid", "art", "specialsortseason", "specialsortepisode", "userrating", "seasonid", "ratings"] };
      this.client.send('VideoLibrary.GetEpisodes', params_out).then((response) => {
        if(response.episodes) {
          let key = null;
          for(let episode of response.episodes) {
            key = 'episode-' + episode.episodeid;
            receptacle.set(key, episode);
          }
          resolve(response.episodes);
        }
      });
    });
  }

  getEpisodeDetails(episode_id) {
    this.debug('getEpisodeDetails()', episode_id);
    return new BluePromise((resolve, reject) => {
      let key = 'episode-' + episode_id;
      if(receptacle.has(key)) {
        this.debug('Cache hit');
        resolve(receptacle.get(key));
      } else {
        let params_out = { episodeid: parseInt(episode_id), properties: ["title", "plot", "votes", "rating", "writer", "firstaired", "playcount", "runtime", "director", "productioncode", "season", "episode", "originaltitle", "showtitle", "cast", "streamdetails", "lastplayed", "fanart", "thumbnail", "file", "resume", "tvshowid", "dateadded", "uniqueid", "art", "specialsortseason", "specialsortepisode", "userrating", "seasonid", "ratings"] };
        this.client.send('VideoLibrary.GetEpisodeDetails', params_out).then((response) => {
          if(response.episodedetails) {
            receptacle.set(key, response.episodedetails);
            resolve(response.episodedetails);
          }
        });
      }
    });
  }

}
