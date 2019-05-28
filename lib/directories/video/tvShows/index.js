'use strict';

module.exports = function(browser) {
	this.browser = browser;
	this.name = 'tvshows';
	this.nodes = [
		new (require('./episode'))(browser),
		new (require('./season'))(browser),
		new (require('./tvShow'))(browser),
		new (require('./tvShowsByGenre'))(browser),
	];
}
