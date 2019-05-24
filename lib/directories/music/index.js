'use strict';


module.exports = function(browser) {
	this.browser = browser;
	this.name = 'music';
	// this.foo = new (require('./test1'));
	// this.bar = new (require('./test2'));
	this.nodes = [
		new (require('./album'))(browser),
		new (require('./albumWall'))(browser),
		new (require('./artist'))(browser),
		new (require('./artistsByName'))(browser),
		new (require('./song'))(browser)
	];
}
