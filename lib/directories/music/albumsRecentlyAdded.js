'use strict';

module.exports = function Directory() {
	this.rand = Math.random();
	this.title = 'Recently added albums';
	this.label = 'Something';
	this.regex = '/music/albums/recently_added';

	this.list = function() {
		return this.rand;
	}
}

/*
module.exports = {
	regex: 'regex',
	title: 'title',
	label: 'label',
	rand: Math.random(),

	build: function() {
		return this.rand;
	}
};
*/
