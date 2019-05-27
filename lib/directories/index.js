'use strict';


module.exports = function(browser) {
	this.browser = browser;
	this.name = 'dirs';
	this.nodes = [
		new (require('./audio'))(browser),
		new (require('./video'))(browser),
		new (require('./nowPlaying'))(browser),
		new (require('./queue'))(browser)
	];
}
