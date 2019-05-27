'use strict';


module.exports = function(browser) {
	this.browser = browser;
	this.name = 'movies';
	this.nodes = [
		new (require('./movie'))(browser),
		new (require('./moviesByGenre'))(browser),
	];
}
