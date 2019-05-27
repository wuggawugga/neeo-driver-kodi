'use strict';

const BluePromise = require('bluebird');
const neeoapi = require('neeo-sdk');
const conf = require('../../../Config');
const debug = require('debug')('neeo-driver-kodi:foo');

module.exports = function Directory(browser) {
	this.browser = browser;
	this.library = this.browser.library;
	this.name = 'movie';
	this.title = 'Movie details';
	this.path = '/video/movie/:movie_id';
	this.thumbnail_widths = conf.get('thumbnail_widths');

	this.list = function(route_in, params_in) {
		return new BluePromise((resolve, reject) => {
			let movie_id = parseInt(route_in[1]);
			this.library.getMovieDetails(movie_id).then((movie) => {
				debug('Movie', movie);
				let title = movie.title;
				if(movie.year) title += ' (' + movie.year + ')';
				const list_options = {
					title: 'Movie Details',
					totalMatchingItems: 1,
					browseIdentifier: route_in[0],
				};
				let list_out = neeoapi.buildBrowseList(list_options);
				list_out.setListTitle(list_options.title);

				list_out.addListHeader(title);

				var item_out = {
					title: title,
					thumbnailUri: this.browser.client.getKodiImage(movie.thumbnail, this.thumbnail_widths.small)
				};
				if(movie.genre) item_out.title = movie.genre.join(', ');
				if(movie.country) item_out.label = '' + movie.country;
				list_out.addListItem(item_out);
				if(movie.tagline) list_out.addListHeader(movie.tagline);

				let list_buttons = [];
				if(movie.runtime) list_buttons.push({title: String.fromCodePoint(8987) + '' + Math.floor(movie.runtime/60) + 'm', inverse: true});
				if(movie.rating) list_buttons.push({title: String.fromCodePoint(11088) + '' + Number.parseFloat(movie.rating).toPrecision(2), inverse: true});
				if(movie.mpaa) list_buttons.push({title: movie.mpaa.replace(/Rated/, ''), inverse: true});;
				if(list_buttons.length > 0) {
					list_out.addListButtons(list_buttons)
				}
				if(movie.plot) {
					item_out = {
						title: 'Plot',
						text: movie.plot,
						affirmativeButtonText: 'Close'
					};
					list_out.addListInfoItem(item_out);
				}

				// director
				// cast

				list_buttons = [
					{title: 'Play', actionIdentifier: 'Internal/playMovie/' + movie_id, uiAction: 'close' },
					{title: 'Queue'},
					{title: 'Mark unwatched'}
				];
				list_out.addListButtons(list_buttons)

				resolve(list_out);
			});
		});
	}
}
