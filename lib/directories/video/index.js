'use strict';


module.exports = function(browser) {
	this.browser = browser;
	this.name = 'video';
	this.nodes = [
		new (require('./movies'))(browser),
//		new (require('./musicVideos'))(browser),
		new (require('./tvShows'))(browser)
	];
}
