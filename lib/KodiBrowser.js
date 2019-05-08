'use strict';

/*
 *	KodiBrowser: Handles list and directories
 */

const debug = require('debug')('neeo-driver-kodi:KodiBrowser');
const neeoapi = require('neeo-sdk');
const BluePromise = require('bluebird');


//const conf = require('./Configstore');

const DEFAULT_PATH = '.';


module.exports = class KodiBrowser {

	constructor(controller) {
		debug('CONSTRUCTOR');
		this.controller = controller;
	}

/*
	toString() {
    return 'KodiBrowser';
  }
*/



	buildList(device_id, params, directory_id) {
		debug('buildList()', device_id, params, directory_id);

		var limit = params.limit || 64;
		var offset = params.offset || 0;
		var start = offset;
		var end = limit;
		if(offset > 0) {
			end = offset + limit;
		}
		const browseIdentifier = params.browseIdentifier || DEFAULT_PATH;
		debug('browseIdentifier', browseIdentifier);

		const listOptions = {
			limit: limit,
			offset: offset,
			browseIdentifier
		};

		var media_type = this.controller.clients[device_id].state.media.type;
		debug('Media type', media_type);

		return new BluePromise((resolve, reject) => {

	    switch(directory_id) {
	      case 'DIRECTORY_QUEUE':
					listOptions.title = 'Current playlist';
	        var params = {
	          playlist_id: undefined,
						properties: [ "title", "art" ],
	          limits: {
	            start: start,
	            end: end,
	          }
	        }
	        if(media_type == 'audio') {
	          params.playlistid = 0;
	        }
	        if(media_type == 'video') {
	          params.playlistid = 1;
	        }
	        this.controller.clients[device_id].send('Playlist.GetItems', params)
	        .then((response) => {
	          debug('response', response);
	          listOptions.total = response.total;
						listOptions.device_id = device_id;
						var list = this.formatList(response, listOptions, browseIdentifier);
						debug('buildList() list', list);
	          resolve(list);
	        });
	        break;
	    }
		});
  }


	formatList(response, listOptions, title) {
		debug('formatList()');

		var itemlist = response.items;

	  if (listOptions.total < listOptions.limit) {
	    listOptions.limit = listOptions.total;
	  }

	  let browseIdentifier = listOptions.browseIdentifier;

	  const options = {
	    title: `Browsing ${title}`,
	    totalMatchingItems: itemlist.total,
	    browseIdentifier,
	    offset: listOptions.offset || 0,
	    limit: listOptions.limit
	  };

	  var list = neeoapi.buildBrowseList(options);
		list.setListTitle(listOptions.title);
		// list.addListHeader({
    //  title: 'My Header',
   	// });
		list.addListHeader('My Header');

	  console.log("browseIdentifier:", browseIdentifier);

	  itemlist.map(item => {
			var params = {
				title: item.title,
				label: item.label,
				thumbnailUri: this.controller.kodiUrl(listOptions.device_id, item.art.thumb)
			};
	    list.addListItem(params);
	  });

		debug('formatList() list', list);
	  return list;
	}


}
