'use strict';


module.exports = function(browser) {
	this.browser = browser;
	this.name = 'audio';
	this.nodes = [
		new (require('./album'))(browser),
		new (require('./albumsByGenre'))(browser),
		new (require('./albumWall'))(browser),
		new (require('./artist'))(browser),
		new (require('./artistsByGenre'))(browser),
		new (require('./song'))(browser),
		new (require('./songsByGenre'))(browser)
	];
}
