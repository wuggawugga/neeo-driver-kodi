'use strict';

module.exports = function(browser) {
	this.browser = browser;
	this.name = 'musicVideos';
	this.nodes = [
		new (require('./musicVideo'))(browser),
		new (require('./musicVideosByGenre'))(browser),
	];
}
