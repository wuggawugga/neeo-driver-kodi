'use strict';

const BluePromise = require('bluebird');
const neeoapi = require('neeo-sdk');
const conf = require('../../../Config');
const debug = require('debug')('neeo-driver-kodi:foo');

module.exports = function Directory(browser) {
	this.browser = browser;
	this.library = this.browser.library;
	this.name = 'episode';
	this.title = 'Episode Details';
//	this.path = '/video/tvshow/:tvshow_id/season/:season_id/episode/:episode_id';
	this.path = '/video/episode/:episode_id';
	this.thumbnail_widths = conf.get('thumbnail_widths');

	this.list = function(route_in, params_in) {
		return new BluePromise((resolve, reject) => {
			let episode_id = parseInt(route_in[1]);
			this.library.getEpisodeDetails(episode_id).then((episode) => {
				let season_id = episode.seasonid;
				let tvshow_id = episode.tvshowid;
				this.library.getSeasonDetails(season_id).then((season) => {
					this.library.getTvShowDetails(tvshow_id).then((tvshow) => {

						const list_options = {
							title: 'Episode Details',
							totalMatchingItems: 1,
							browseIdentifier: route_in[0],
						};
						let list_out = neeoapi.buildBrowseList(list_options);
						list_out.setListTitle(list_options.title);

						if(episode.title) list_out.addListHeader(episode.title);

						var item_out = {
							title: episode.label,
							label: ''
						};
						if(episode.firstaired) item_out.label = 'First aired ' + episode.firstaired;
						if(episode.rating) item_out.label += ' ' + String.fromCodePoint(11088) + '' + Number.parseFloat(episode.rating).toPrecision(2);
						if(episode.thumbnail) item_out.thumbnailUri = this.browser.client.getKodiImage(episode.thumbnail, this.thumbnail_widths.tile);
						list_out.addListItem(item_out);

						if(episode.plot) {
							item_out = {
								title: 'Plot',
								text: episode.plot,
								affirmativeButtonText: 'Close'
							};
							list_out.addListInfoItem(item_out);
						}
						if(episode.cast) {
							list_out.addListHeader('Cast');
							for(let actor of episode.cast) {
								item_out = {
									title: actor.name,
									label: actor.role
								}
								if(actor.thumbnail) item_out.thumbnailUri = this.browser.client.getKodiImage(actor.thumbnail, this.thumbnail_widths.tile);
								list_out.addListItem(item_out);
							}
						}

						let list_buttons = [
							{title: 'Play', actionIdentifier: 'Internal/playEpisode/' + episode_id, uiAction: 'close' },
							{title: 'Queue', actionIdentifier: 'Internal/queueEpisode/' + episode_id, uiAction: 'close' },
							// {title: 'Mark unwatched'}
						];
						list_out.addListButtons(list_buttons)

						resolve(list_out);
					});
				});
			});
		});
	}
}
