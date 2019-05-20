'use strict';


module.exports = function(browser) {
	this.browser = browser;
	this.name = 'dirs';
	this.nodes = [
		new (require('./music'))(browser)
	];
}
