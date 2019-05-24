'use strict';


module.exports = function(browser) {
	this.browser = browser;
	this.name = 'video';
	// this.foo = new (require('./test1'));
	// this.bar = new (require('./test2'));
	this.nodes = [
		new (require('./tvShows'))(browser)
	];
}
