'use strict';

var Receptacle = require('receptacle');
var image_cache = new Receptacle({ max: 192 });
var meta_cache = new Receptacle({ max: 384 });

module.exports = {
	image_cache: image_cache,
	meta_cache: meta_cache
};
