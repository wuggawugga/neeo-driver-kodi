'use strict';

module.exports = {
	root: {
		regexp: '/:key*',
		music: {
			title: 'Music',
			test: {
				title: 'TEST',
				browseIdentifier: '/music/album/4612'
			},
			artists: {
				title: 'Artists',
				by_genre: {
					disabled: true,
					title: 'Browse by Genre',
					label: 'Browse artists by genre',
					index: {title: 'Index'}
//					list: {method: 'AudioLibrary.GetGenres', key: 'genres', params: {properties: ["title", "thumbnail"], sort: {method: "title"}}},
	//				action: {method: 'getArtistsByGenre', param_key: 'genreid'}
				},
				by_name: {
					title: 'Browse by Name',
					label: 'Browse artists by name',
				// 	list: {method: 'AudioLibrary.GetArtists', key: 'artistid', path: '/music/artist/*/albums', params: {albumartistsonly: true, properties: ["thumbnail"], sort: {method: "artist"}}},
				}
			},
			albums: {
				title: 'Albums',
				recently_added: {
					title: 'Recently Added Albums',
					list: {method: 'AudioLibrary.GetRecentlyAddedAlbums', key: 'albums', params: {properties: ["title", "thumbnail"], sort: {method: "title"}}},
				},
				recently_played: {
					title: 'Recently Played Albums',
					list: {method: 'AudioLibrary.GetRecentlyPlayedAlbums', key: 'albums', params: {properties: ["title", "thumbnail"], sort: {method: "title"}}},
				},
				by_genre: {
					disabled: true,
					title: 'Albums by Genre',
					label: 'Browse albums by genre',
					list: {method: 'AudioLibrary.GetGenres', key: 'genres', params: {properties: ["title", "thumbnail"], sort: {method: "title"}}},
					action: {method: 'getArtistsByGenre', param_key: 'genreid'}
				},
				by_title: {
					title: 'Browse by title',
					label: 'Browse albums by title',
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
					list: {method: 'AudioLibrary.GetGenres', key: 'genres', params: {properties: ["title", "thumbnail"], sort: {method: "title"}}},
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
		tv_shows: {
			title: 'TV Shows',
			seasons: {
				episodes: {}
			},
			recently_added: {}
		},
		movies: {
			title: 'Movies',
			recently_added: {},
			movie_sets: {}
		},
		music_videos: {
			title: 'Music Videos',
			recently_added: {},
		}
	}
};
