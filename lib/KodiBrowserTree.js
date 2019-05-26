/*
 *	Basic tree structure for directory browser
 */

'use strict';

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
				random: {
					title: 'Random albums',
					label: 'Albums in random order',
					list: {
						method: 'AudioLibrary.GetAlbums', key: 'albums', params: {properties: ['title', 'thumbnail', 'displayartist'], sort: {method: 'random'}},
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
//					action: {method: 'getArtistsByGenre', param_key: 'genreid'}
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
				random: {
					title: 'Random artists',
					label: 'Artists in random order',
					list: {
						method: 'AudioLibrary.GetAlbums', key: 'albums', params: {properties: ['title', 'thumbnail', 'displayartist'], sort: {method: 'random'}},
						item_label: 'displayartist', item_path: '/music/album/*', item_key: 'albumid'
					},
				},
				by_genre: {
					disabled: true,
					title: 'Browse by Genre',
					label: 'Browse artists by genre',
					index: {title: 'Index'}
					//					list: {method: 'AudioLibrary.GetGenres', key: 'genres', params: {properties: ['title', 'thumbnail'], sort: {method: 'title'}}},
					//				action: {method: 'getArtistsByGenre', param_key: 'genreid'}
				},
				by_name: {
					title: 'Browse by Name',
					label: 'Browse artists by name',
					// 	list: {method: 'AudioLibrary.GetArtists', key: 'artistid', path: '/music/artist/*/albums', params: {albumartistsonly: true, properties: ['thumbnail'], sort: {method: 'artist'}}},
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
				recently_added: {},
				movie_sets: {},



				random: {
					title: 'Random movies',
					label: 'Movies in random order',
					// list: {
					// 	method: 'VideoLibrary.GetMovies', key: 'movies', params: {properties: ['title', 'thumbnail', 'rating', 'runtime'], sort: {method: 'random'}},
					// 	item_label: 'rating', item_path: '/video/movie/*', item_key: 'movieid'
					// },
				},
				by_genre: {
					disabled: false,
					title: 'Browse by Genre',
					label: 'Browse movies by genre',
					list: {
						method: 'AudioLibrary.GetGenres', key: 'genres', params: {properties: ['title', 'thumbnail'], sort: {method: 'title'}},
						item_path: '/music/albums/genre/*', item_key: 'genreid'
					},
//					action: {method: 'getArtistsByGenre', param_key: 'genreid'}
				},
				by_title: {
					title: 'Browse by title',
					label: 'Browse movies by title',
					list: {
						method: 'AudioLibrary.GetAlbums', key: 'albums', params: {properties: ['title', 'thumbnail', 'displayartist'], sort: {method: 'title', ignorearticle: true}},
						item_label: 'displayartist', item_path: '/music/album/*', item_key: 'albumid'
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
