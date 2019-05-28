'use strict';

const BluePromise = require('bluebird');
const neeoapi = require('neeo-sdk');
const conf = require('../../../Config');
const debug = require('debug')('neeo-driver-kodi:foo');

module.exports = function Directory(browser) {
	this.browser = browser;
	this.library = this.browser.library;
	this.name = 'tvshow';
	this.title = 'TV Show Details';
	this.path = '/video/tvshow/:tvshow_id';
	this.thumbnail_widths = conf.get('thumbnail_widths');

	this.list = function(route_in, params_in) {
		return new BluePromise((resolve, reject) => {
			let tvshow_id = parseInt(route_in[1]);
			this.library.getTvShowDetails(tvshow_id).then((tvshow) => {
				this.library.getSeasons(tvshow_id).then((seasons) => {
					debug('TV Show', tvshow);
					debug('Seasons', seasons);
					let title = tvshow.title;
					if(tvshow.year) title += ' (' + tvshow.year + ')';
					const list_options = {
						title: 'TV Show Details',
						totalMatchingItems: 1,
						browseIdentifier: route_in[0],
					};
					let list_out = neeoapi.buildBrowseList(list_options);
					list_out.setListTitle(list_options.title);

					list_out.addListHeader(title);

					var item_out = {
						title: title,
						thumbnailUri: this.browser.client.getKodiImage(tvshow.thumbnail, this.thumbnail_widths.tile)
					};
					if(tvshow.genre) item_out.title = tvshow.genre.join(', ');
					if(tvshow.premiered) item_out.label = 'Premiered ' + tvshow.premiered;
					if(tvshow.country) item_out.label = '' + tvshow.country;
					list_out.addListItem(item_out);
					if(tvshow.tagline) list_out.addListHeader(tvshow.tagline);

					let list_buttons = [];
//					if(tvshow.runtime) list_buttons.push({title: Math.floor(tvshow.runtime/60) + 'm', inverse: true});
					if(tvshow.rating) list_buttons.push({title: 'Rating ' + Number.parseFloat(tvshow.rating).toPrecision(2), inverse: true});
//					if(tvshow.mpaa) list_buttons.push({title: tvshow.mpaa.replace(/Rated/, ''), inverse: true});;
					if(tvshow.season) list_buttons.push({title: tvshow.season + ' seasons', inverse: true});;
					if(tvshow.episode) list_buttons.push({title: tvshow.episode + ' episodes', inverse: true});;
					if(list_buttons.length > 0) {
						list_out.addListButtons(list_buttons)
					}
					if(tvshow.plot) {
						item_out = {
							title: 'Plot',
							text: tvshow.plot,
							affirmativeButtonText: 'Close'
						};
						list_out.addListInfoItem(item_out);
					}

					for(let season of seasons) {
						item_out = {
							title: season.label,
							browseIdentifier: route_in[0] + '/season/' + season.seasonid
						};
						if(season.episode) item_out.label = season.episode + ' episodes';
						if(season.thumbnail) item_out.thumbnailUri = this.browser.client.getKodiImage(season.thumbnail, this.thumbnail_widths.small);

						list_out.addListItem(item_out);
					}


					list_buttons = [
						{title: 'Play', actionIdentifier: 'Internal/playTvShow/' + tvshow_id, uiAction: 'close' },
						// {title: 'Queue'},
						// {title: 'Mark unwatched'}
					];
					list_out.addListButtons(list_buttons)

					resolve(list_out);
				});
			});
		});
	}
}
