/*
 *	Basic tree structure for directory browser
 */

'use strict';

const debug = require('debug')('neeo-driver-kodi:KodiBrowserTree');

module.exports = {
	root: {
		audio: {
			title: 'Audio Library',
/*
 *	Audio library - Albums
 */
			albums: {
				title: 'Albums',
				recently_played: {
					title: 'Recently Played Albums',
					label: 'Most recently played albums',
					list: {
						thumbnails: true, method: 'AudioLibrary.GetRecentlyPlayedAlbums', key: 'albums', params: {properties: ['title', 'thumbnail', 'displayartist'], sort: {method: 'lastplayed', order: 'descending'}},
						item_label: 'displayartist', item_path: '/audio/album/*', item_key: 'albumid'
					},
				},
				recently_added: {
					title: 'Recently Added Albums',
					label: 'Most recently added albums',
					list: {
						thumbnails: true, method: 'AudioLibrary.GetRecentlyAddedAlbums', key: 'albums', params: {properties: ['title', 'thumbnail', 'displayartist'], sort: {method: 'dateadded', order: 'descending'}},
						item_label: 'displayartist', item_path: '/audio/album/*', item_key: 'albumid'
					},
				},
				top_albums: {
					title: 'Top Albums',
					label: 'Most frequently played albums',
					list: {
						thumbnails: true, method: 'AudioLibrary.GetAlbums', key: 'albums',
						params: {
							properties: ['title', 'thumbnail', 'displayartist'],
							filter: {field: 'playcount', operator: 'greaterthan', value: '0'},
							sort: {method: 'playcount', order: 'descending'}
						},
						item_label: 'displayartist', item_path: '/audio/album/*', item_key: 'albumid'
					},
				},
				random: {
					title: 'Random Albums',
					label: 'Albums in random order',
					list: {
						thumbnails: true, method: 'AudioLibrary.GetAlbums', key: 'albums', params: {properties: ['title', 'thumbnail', 'displayartist'], sort: {method: 'random'}},
						item_label: 'displayartist', item_path: '/audio/album/*', item_key: 'albumid'
					},
				},
				by_genre: {
					disabled: false,
					title: 'Browse by Genre',
					label: 'Browse albums by genre',
					list: {
						thumbnails: true, method: 'AudioLibrary.GetGenres', key: 'genres', params: {properties: ['title', 'thumbnail'], sort: {method: 'title'}},
						item_label: empty, item_path: '/audio/albums/genre/*', item_key: 'genreid'
					},
				},
				by_title: {
					title: 'Browse by Title',
					label: 'Browse albums by title',
					list: {
						thumbnails: true, method: 'AudioLibrary.GetAlbums', key: 'albums', params: {properties: ['title', 'thumbnail', 'displayartist'], sort: {method: 'title', ignorearticle: true}},
						item_label: 'displayartist', item_path: '/audio/album/*', item_key: 'albumid'
					},
				},
			},
/*
 *	Audio library - Artists
 */
			artists: {
				title: 'Artists',
				recently_added: {
					title: 'Recently Added Artists',
					label: 'Most recently added artists',
					list: {
						thumbnails: true, method: 'AudioLibrary.GetArtists', key: 'artists', params: {albumartistsonly: false, properties: ['thumbnail', 'dateadded'], sort: {method: 'dateadded', order: 'descending'}},
						item_title: 'artist', item_label: empty, item_path: '/audio/artist/*', item_key: 'artistid'
					},
				},
				random: {
					title: 'Random Artists',
					label: 'Artists in random order',
					list: {
						thumbnails: true, method: 'AudioLibrary.GetArtists', key: 'artists', params: {albumartistsonly: true, properties: ['thumbnail'], sort: {method: 'random'}},
						item_title: 'artist', item_label: empty, item_path: '/audio/artist/*', item_key: 'artistid'
					},
				},
				by_genre: {
					title: 'Browse by Genre',
					label: 'Browse artists by genre',
					list: {
						thumbnails: true, method: 'AudioLibrary.GetGenres', key: 'genres', params: {properties: ['title', 'thumbnail'], sort: {method: 'title'}},
						item_label: empty, item_path: '/audio/artists/genre/*', item_key: 'genreid'
					},
				},
				by_name: {
					title: 'Browse by Name',
					label: 'Browse artists by name',
					list: {
						thumbnails: true, method: 'AudioLibrary.GetArtists', key: 'artists', params: {albumartistsonly: true, properties: ['thumbnail'], sort: {method: 'artist'}},
						item_title: 'artist', item_label: empty, item_path: '/audio/artist/*', item_key: 'artistid'
					},
				}
			},
/*
 *	Audio library - Songs
 */
			songs: {
				title: 'Songs',
				recently_played: {
					title: 'Recently Played Songs',
					label: 'Most recently played songs',
					list: {
						thumbnails: true, method: 'AudioLibrary.GetRecentlyPlayedSongs', key: 'songs', params: {properties: ['title', 'thumbnail', 'displayartist'], sort: {method: 'lastplayed', order: 'descending'}},
						item_label: 'displayartist', item_path: '/audio/song/*', item_key: 'songid'
					},
				},
				recently_added: {
					title: 'Recently Added Songs',
					label: 'Most recently added songs',
					list: {
						thumbnails: true, method: 'AudioLibrary.GetRecentlyAddedSongs', key: 'songs', params: {properties: ['title', 'thumbnail', 'displayartist'], sort: {method: 'dateadded', order: 'descending'}},
						item_label: 'displayartist', item_path: '/audio/song/*', item_key: 'songid'
					},
				},
				top_songs: {
					title: 'Top Songs',
					label: 'Most frequently played songs',
					list: {
						thumbnails: true, method: 'AudioLibrary.GetSongs', key: 'songs',
						params: {
							properties: ['title', 'thumbnail', 'displayartist'],
							filter: {field: 'playcount', operator: 'greaterthan', value: '0'},
							sort: {method: 'playcount', order: 'descending'}
						},
						item_label: 'displayartist', item_path: '/audio/song/*', item_key: 'songid'
					},
				},
				random: {
					title: 'Random Songs',
					label: 'Songs in random order',
					list: {
						thumbnails: true, method: 'AudioLibrary.GetSongs', key: 'songs', params: {properties: ['title', 'thumbnail', 'displayartist'], sort: {method: 'random'}},
						item_label: 'displayartist', item_path: '/audio/album/*', item_key: 'albumid'
					},
				},
				by_genre: {
					title: 'Songs by Genre',
					label: 'Browse songs by genre',
					list: {
						thumbnails: true, method: 'AudioLibrary.GetGenres', key: 'genres', params: {properties: ['title', 'thumbnail'], sort: {method: 'title'}},
						item_label: empty, item_path: '/audio/songs/genre/*', item_key: 'genreid'
					},
				},
				by_title: {
					title: 'Browse by Title',
					label: 'Browse songs by title',
					list: {
						thumbnails: true, method: 'AudioLibrary.GetSongs', key: 'songs', params: {properties: ['title', 'thumbnail', 'displayartist'], sort: {method: 'title'}},
						item_label: 'displayartist', item_path: '/audio/song/*', item_key: 'songid'
					},
				}
			},
/*
 *	Audio library - Playlists
 */
			playlists: {
				title: 'Playlists',
			}
		},
		video: {
			title: 'Video Library',
/*
 *	Video library - Movies
 */
			movies: {
				title: 'Movies',
				movie_sets: {},
				in_progress: {
					title: 'Continue Watching',
					label: 'Movies in progress',
					list: {
						title: 'Movies in Progress',
						method: 'VideoLibrary.GetMovies', key: 'movies', params: {properties: ['title', 'thumbnail', 'country', 'genre', 'year'],
						sort: {method: 'lastplayed', order: 'descending', ignorearticle: true}, filter: {operator: 'true', field: 'inprogress', value: ''}},
						item_path: '/video/movie/*', item_key: 'movieid', item_title: movieTitle, item_label: movieLabel
					},
				},
				recently_added: {
					title: 'Recently Added Movies',
					label: 'Most recently added movies',
					list: {
						title: 'Recently Added Movies',
						method: 'VideoLibrary.GetRecentlyAddedMovies', key: 'movies', params: {properties: ['title', 'thumbnail', 'country', 'genre', 'year'], sort: {method: 'dateadded', order: 'descending', ignorearticle: true}},
						item_path: '/video/movie/*', item_key: 'movieid', item_title: movieTitle, item_label: movieLabel
					},
				},
				random: {
					title: 'Random Movies',
					label: 'Browse movies in random order',
					list: {
						title: 'Random Movies',
						method: 'VideoLibrary.GetMovies', key: 'movies', params: {properties: ['title', 'thumbnail', 'country', 'genre', 'year'], sort: {method: 'random', ignorearticle: true}},
						item_path: '/video/movie/*', item_key: 'movieid', item_title: movieTitle, item_label: movieLabel
					},
				},
				by_genre: {
					title: 'Browse by Genre',
					label: 'Browse movies by genre',
					list: {
						title: 'Movies by Genre',
						method: 'VideoLibrary.GetGenres', key: 'genres', params: {type: "movie", sort: {method: 'label'}},
						item_title: 'label', item_label: empty, item_path: '/video/movies/genre/*', item_key: 'genreid'
					},
				},
				by_title: {
					title: 'Browse by Title',
					label: 'Browse movies by title',
					list: {
						title: 'Movies by Title',
						method: 'VideoLibrary.GetMovies', key: 'movies', params: {properties: ['title', 'thumbnail', 'country', 'genre', 'year'], sort: {method: 'title', ignorearticle: true}},
						item_path: '/video/movie/*', item_key: 'movieid', item_title: movieTitle, item_label: movieLabel
					},
				},
			},
/*
 *	Video library - TV shows
 */
			tvshows: {
				title: 'TV Shows',
				recently_played: {
					title: 'Continue Watching',
					label: 'TV shows in progress',
					list: {
						title: 'TV Shows in Progress',
						method: 'VideoLibrary.GetTVShows', key: 'tvshows', params: {properties: ['title', 'thumbnail', 'genre', 'year'],
						filter: {operator: 'true', field: 'inprogress', value: ''}, sort: {method: 'lastplayed', order: 'descending', ignorearticle: true}},
						item_path: '/video/tvshow/*', item_key: 'tvshowid', item_title: movieTitle, item_label: movieLabel
					},
				},
				recently_added: {
					title: 'Recently Added Episodes',
					label: 'Most recently added TV show episodes',
					list: {
						title: 'Recently Added Episodes',
						method: 'VideoLibrary.GetEpisodes', key: 'episodes', params: {properties: ['showtitle', 'thumbnail'],
						sort: {method: 'dateadded', order: 'descending', ignorearticle: true}, limits: {start: 0, end: 32}},
						item_path: '/video/episode/*', item_key: 'episodeid', item_title: 'showtitle', item_label: 'label'
					},
				},
				random: {
					title: 'Random TV Shows',
					label: 'Browse TV shows in random order',
					list: {
						title: 'Random TV shows',
						method: 'VideoLibrary.GetTVShows', key: 'tvshows', params: {properties: ['title', 'thumbnail', 'genre', 'year'], sort: {method: 'random', ignorearticle: true}},
						item_path: '/video/tvshow/*', item_key: 'tvshowid', item_title: movieTitle, item_label: movieLabel
					},
				},
				by_genre: {
					disabled: false,
					title: 'Browse by Genre',
					label: 'Browse TV shows by genre',
					list: {
						title: 'TV Shows by Genre',
						method: 'VideoLibrary.GetGenres', key: 'genres', params: {type: "tvshow", sort: {method: 'label'}},
						item_title: 'label', item_label: empty, item_path: '/video/tvshows/genre/*', item_key: 'genreid'
					},
				},
				by_title: {
					title: 'Browse by title',
					label: 'Browse TV shows by title',
					list: {
						title: 'TV Shows by Title',
						method: 'VideoLibrary.GetTVShows', key: 'tvshows', params: {properties: ['title', 'thumbnail', 'genre', 'year'], sort: {method: 'title', ignorearticle: true}},
						item_path: '/video/tvshow/*', item_key: 'tvshowid', item_title: movieTitle, item_label: movieLabel
					},
				},
			},
/*
 *	Video library - Music videos
 */
			music_videos: {
				title: 'Music Videos',
				recently_added: {
					title: 'Recently Added Music Videos',
					label: 'Most recently added music videos',
					list: {
						title: 'Recently Added Music Videos',
						method: 'VideoLibrary.GetMusicVideos', key: 'musicvideos', params: {properties: ['title', 'artist', 'thumbnail', 'genre', 'runtime', 'year'], sort: {method: 'dateadded', order: 'descending', ignorearticle: true}},
						item_path: '/video/musicvideo/*', item_key: 'musicvideoid', item_title: movieTitle, item_label: musicVideoLabel
					},
				},
				random: {
					title: 'Random Music Videos',
					label: 'Browse music videos in random order',
					list: {
						title: 'Random Music Videos',
						method: 'VideoLibrary.GetMusicVideos', key: 'musicvideos', params: {properties: ['title', 'artist', 'thumbnail', 'genre', 'runtime', 'year'], sort: {method: 'random', ignorearticle: true}},
						item_path: '/video/musicvideo/*', item_key: 'musicvideoid', item_title: movieTitle, item_label: musicVideoLabel
					},
				},
				by_genre: {
					title: 'Browse by Genre',
					label: 'Browse music videos by genre',
					list: {
						title: 'Music Videos by Genre',
						method: 'AudioLibrary.GetGenres', key: 'genres', params: {properties: ['title', 'thumbnail'], sort: {method: 'title'}},
						item_label: empty, item_path: '/video/musicvideos/genre/*', item_key: 'genreid'
					},
				},
				by_title: {
					title: 'Browse by Title',
					label: 'Browse music videos by title',
					list: {
						title: 'Music Videos by Title',
						method: 'VideoLibrary.GetMusicVideos', key: 'musicvideos', params: {properties: ['title', 'artist', 'thumbnail', 'genre', 'runtime', 'year'], sort: {method: 'title', ignorearticle: true}},
						item_path: '/video/musicvideo/*', item_key: 'musicvideoid', item_title: movieTitle, item_label: musicVideoLabel
					},
				},
			}
		}
	},
	tests: {
		title: 'Tests',
		missing_image: {
			disabled: true,
			title: 'Missing thumbnail',
			browseIdentifier: '/audio/album/36'
		},
		activeplayer: {
			title: 'getActivePlayer',
			actionIdentifier: [ 'Internal', 'getActivePlayer' ].join('|')
		},
		playerprops: {
			title: 'getPlayerProperties',
			actionIdentifier: [ 'Internal', 'getPlayerProperties', 0 ].join('|')
		},
		playeritem: {
			title: 'getPlayerItem',
			actionIdentifier: [ 'Internal', 'getPlayerItem', 0 ].join('|')
		},
		wall: {
			title: 'Album Wall',
			label: 'Album wall',
			browseIdentifier: '/audio/albums/wall'
		}
	}
};

function empty() {
	return '';
}

function movieTitle(movie) {
	let title = movie.title;
	if(movie.year) title += ' (' + movie.year + ')';
	return title;
}

function movieLabel(movie) {
	let parts = [];
	if(movie.genre && movie.genre.length) parts.push(movie.genre[0]);
	if(movie.runtime) parts.push('' + Math.floor(movie.runtime/60) + 'm');
	if(movie.country) parts.push(movie.country);
	return parts.join(' - ');
}

function musicVideoLabel(v) {
	let parts = [];
	if(v.artist && v.artist.length) parts.push(v.artist.join(', '));
	// if(movie.runtime) parts.push('' + Math.floor(movie.runtime/60) + 'm');
	// if(movie.country) parts.push(movie.country);
	// debug(movie);
	// debug(parts);
	return parts.join(' - ');
}
