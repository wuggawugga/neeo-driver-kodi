'use strict';

var Receptacle = require('receptacle');
var cache = new Receptacle({ max: 100 });

module.exports = cache;
