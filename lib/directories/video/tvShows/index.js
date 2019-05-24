'use strict';


module.exports = function(browser) {
	this.browser = browser;
	this.name = 'tvshows';
	// this.foo = new (require('./test1'));
	// this.bar = new (require('./test2'));
	this.nodes = [
		new (require('./showsByTitle'))(browser),
	];
}
