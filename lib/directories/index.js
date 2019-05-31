'use strict';


module.exports = function(browser) {
	this.browser = browser;
	this.name = 'dirs';
	this.nodes = [
		new (require('./audio'))(browser),
		new (require('./favourites'))(browser),
		new (require('./nowPlaying'))(browser),
		new (require('./queue'))(browser),
		new (require('./video'))(browser),
	];
}
