/*
 *	Basic tree structure for directory browser
 */

'use strict';

const debug = require('debug')('neeo-driver-kodi:KodiBrowserTree');

module.exports = {
	root: {
		music: {
			title: 'Music Library',
			albums: {
				title: 'Albums',
				recently_played: {
					title: 'Recently Played Albums',
					list: {
						method: 'AudioLibrary.GetRecentlyPlayedAlbums', key: 'albums', params: {properties: ['title', 'thumbnail', 'displayartist'], sort: {method: 'title'}},
						item_label: 'displayartist', item_path: '/music/album/*', item_key: 'albumid'
					},
				},
				recently_added: {
					title: 'Recently Added Albums',
					list: {
						method: 'AudioLibrary.GetRecentlyAddedAlbums', key: 'albums', params: {properties: ['title', 'thumbnail', 'displayartist'], sort: {method: 'title'}},
						item_label: 'displayartist', item_path: '/music/album/*', item_key: 'albumid'
					},
				},
				top_albums: {
					title: 'Top Albums',
					label: 'Most frequently played albums',
					list: {
						method: 'AudioLibrary.GetAlbums', key: 'albums',
						params: {
							properties: ['title', 'thumbnail', 'displayartist'],
							filter: {field: 'playcount', operator: 'greaterthan', value: '0'},
							sort: {method: 'playcount', order: 'descending'}
						},
						item_label: 'displayartist', item_path: '/music/album/*', item_key: 'albumid'
					},
				},
				by_genre: {
					disabled: false,
					title: 'Browse by Genre',
					label: 'Browse albums by genre',
					list: {
						method: 'AudioLibrary.GetGenres', key: 'genres', params: {properties: ['title', 'thumbnail'], sort: {method: 'title'}},
						item_path: '/music/albums/genre/*', item_key: 'genreid'
					},
				},
				random: {
					title: 'Random albums',
					label: 'Albums in random order',
					list: {
						method: 'AudioLibrary.GetAlbums', key: 'albums', params: {properties: ['title', 'thumbnail', 'displayartist'], sort: {method: 'random'}},
						item_label: 'displayartist', item_path: '/music/album/*', item_key: 'albumid'
					},
				},
				by_title: {
					title: 'Browse by title',
					label: 'Browse albums by title',
					list: {
						method: 'AudioLibrary.GetAlbums', key: 'albums', params: {properties: ['title', 'thumbnail', 'displayartist'], sort: {method: 'title', ignorearticle: true}},
						item_label: 'displayartist', item_path: '/music/album/*', item_key: 'albumid'
					},
				},
			},
			artists: {
				title: 'Artists',
				by_genre: {
					disabled: false,
					title: 'Browse by Genre',
					label: 'Browse artists by genre',
					list: {
						method: 'AudioLibrary.GetGenres', key: 'genres', params: {properties: ['title', 'thumbnail'], sort: {method: 'title'}},
						item_path: '/music/artists/genre/*', item_key: 'genreid'
					},
				},
				random: {
					title: 'Random artists',
					label: 'Artists in random order',
					list: {
						method: 'AudioLibrary.GetArtists', key: 'artists', params: {albumartistsonly: true, properties: ['thumbnail'], sort: {method: 'random'}},
						item_title: 'artist', item_path: '/music/artist/*', item_key: 'artistid'
					},
				},
				by_name: {
					title: 'Browse by Name',
					label: 'Browse artists by name',
					list: {
						method: 'AudioLibrary.GetArtists', key: 'artists', params: {albumartistsonly: true, properties: ['thumbnail'], sort: {method: 'artist'}},
						item_title: 'artist', item_path: '/music/artist/*', item_key: 'artistid'
					},
				}
			},
			songs: {
				title: 'Songs',
				recently_added: {
					title: 'Recently Added Songs',
				},
				recently_played: {
					title: 'Recently Played Songs',
				},
				by_genre: {
					disabled: true,
					title: 'Songs by Genre',
					label: 'Browse songs by genre',
					list: {method: 'AudioLibrary.GetGenres', key: 'genres', params: {properties: ['title', 'thumbnail'], sort: {method: 'title'}}},
					action: {method: 'getArtistsByGenre', param_key: 'genreid'}
				},
				by_title: {
					title: 'Browse by title',
					label: 'Browse songs by title',
				}
			},
			playlists: {
				title: 'Playlists',
			}
		},
		video: {
			title: 'Video Library',
			tv_shows: {
				title: 'TV Shows',
				by_title: {
					title: 'Browse by title',
					label: 'Browse shows by title',
				},
				seasons: {
					episodes: {}
				},
				recently_added: {}
			},
			movies: {
				title: 'Movies',
				movie_sets: {},
				in_progress: {
					title: 'Continue Watching',
					label: 'Movies in progress',
					list: {
						title: 'Random Movies',
						method: 'VideoLibrary.GetMovies', key: 'movies', params: {properties: ['title', 'thumbnail', 'country', 'genre', 'year'], sort: {method: 'lastplayed', order: 'descending', ignorearticle: true}, filter: {operator: 'true', field: 'inprogress', value: ''}},
						item_path: '/video/movie/*', item_key: 'movieid',
						item_title: movieTitle, item_label: movieLabel
					},
				},
				recently_added: {
					title: 'Recently Added Movies',
					label: 'Most recently added movies',
					list: {
						title: 'Recently Added Movies',
						method: 'VideoLibrary.GetRecentlyAddedMovies', key: 'movies', params: {properties: ['title', 'thumbnail', 'country', 'genre', 'year'], sort: {method: 'title', ignorearticle: true}},
						item_path: '/video/movie/*', item_key: 'movieid',
						item_title: movieTitle, item_label: movieLabel
					},
				},
				by_genre: {
					title: 'Browse by Genre',
					label: 'Browse movies by genre',
					list: {
						title: 'Movies by Genre',
						method: 'VideoLibrary.GetGenres', key: 'genres', params: {type: "movie", sort: {method: 'title'}},
						item_path: '/video/movies/genre/*', item_key: 'genreid'
					},
				},
				random: {
					title: 'Random Movies',
					label: 'Browse movies in random order',
					list: {
						title: 'Random Movies',
						method: 'VideoLibrary.GetMovies', key: 'movies', params: {properties: ['title', 'thumbnail', 'country', 'genre', 'year'], sort: {method: 'random', ignorearticle: true}},
						item_path: '/video/movie/*', item_key: 'movieid',
						item_title: movieTitle, item_label: movieLabel
					},
				},
				by_title: {
					title: 'Browse by Title',
					label: 'Browse movies by title',
					list: {
						title: 'Movies by Title',
						method: 'VideoLibrary.GetMovies', key: 'movies', params: {properties: ['title', 'thumbnail', 'country', 'genre', 'year'], sort: {method: 'title', ignorearticle: true}},
						item_path: '/video/movie/*', item_key: 'movieid',
						item_title: movieTitle, item_label: movieLabel
					},
				},
			},
			music_videos: {
				title: 'Music Videos',
				recently_added: {},
			}
		}
	},
	tests: {
		title: 'Tests',
		missing_image:{
			title: 'Missing thumbnail',
			browseIdentifier: '/music/album/36'
		},
		activeplayer: {
			title: 'getActivePlayer',
			actionIdentifier: 'Internal/getActivePlayer'
		},
		playerprops: {
			title: 'getPlayerProperties',
			actionIdentifier: 'Internal/getPlayerProperties/0'
		},
		playeritem: {
			title: 'getPlayerItem',
			actionIdentifier: 'Internal/getPlayerItem/0'
		},
		wall: {
			title: 'Album Wall',
			label: 'Album wall',
			browseIdentifier: '/music/albums/wall'
		}
	}
};

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
	debug(movie);
	debug(parts);
	return parts.join(' - ');
}
