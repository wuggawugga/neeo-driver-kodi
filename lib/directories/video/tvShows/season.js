'use strict';

const BluePromise = require('bluebird');
const neeoapi = require('neeo-sdk');
const conf = require('../../../Config');
const debug = require('debug')('neeo-driver-kodi:foo');

module.exports = function Directory(browser) {
	this.browser = browser;
	this.library = this.browser.library;
	this.name = 'season';
	this.title = 'Season Details';
	this.path = '/video/tvshow/:tvshow_id/season/:season_id';
	this.thumbnail_widths = conf.get('thumbnail_widths');

	this.list = function(route_in, params_in) {
		return new BluePromise((resolve, reject) => {
			let tvshow_id = parseInt(route_in[1]);
			let season_id = parseInt(route_in[2]);
			this.library.getSeasonDetails(season_id).then((season) => {
				this.library.getEpisodes(tvshow_id, season.season).then((episodes) => {
					debug('Season', season);
					debug('Episodes', episodes);
					let title = season.showtitle + ' Season ' + season.season;
					const list_options = {
						title: 'Season Details',
						totalMatchingItems: 1,
						browseIdentifier: route_in[0],
					};
					let item_out = {};
					let list_out = neeoapi.buildBrowseList(list_options);
					list_out.setListTitle(list_options.title);

					list_out.addListHeader(title);

					for(let episode of episodes) {
						let tag = 'S' + season.season.toString().padStart(2, '0') + 'E' + episode.episode.toString().padStart(2, '0');
						item_out = {
							title: tag,
//							browseIdentifier: '/video/tvshow/' + tvshow_id + '/season/' + season.seasonid + '/episode/' + episode.episodeid,
							browseIdentifier: '/video/episode/' + episode.episodeid,
						};
						if(episode.title) item_out.title += ': ' + episode.title;
						if(episode.firstaired) item_out.label = 'First aired ' + episode.firstaired;
						if(episode.thumbnail) item_out.thumbnailUri = this.browser.client.getKodiImage(episode.thumbnail, this.thumbnail_widths.small);

						list_out.addListItem(item_out);
					}

					let list_buttons = [
						{title: 'Play', actionIdentifier: 'Internal/playSeason/' + season_id, uiAction: 'close' },
					];
					list_out.addListButtons(list_buttons)

					resolve(list_out);
				});
			});
		});
	}
}
