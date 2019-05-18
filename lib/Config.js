'use strict';

const Configstore = require('configstore');

var conf = new Configstore('neeo-driver-kodi');
conf.add = function(key) {
	if(!conf.has(key)) {
		conf.set(key, {});
	}
}

conf.add('kodi_instances', {});
conf.add('localhost', {});
// Port for the http interface
conf.set('localhost.http_port', 3099);
// Array of directories to search for images
conf.set('image_paths', ['images']);
// Default thumbnail image
conf.set('default_thumbnail', 'kodi-transparent.png');
// Display notice in Kodi when driver is connected
conf.set('kodi_greeting', {
		title: 'NEEO',
		message: 'The NEEO remote is connected',
		image: 'neeo-circle.jpg',
		displaytime: 5000
});
conf.set('directory_page_size', 12);

// FIXME: seen is temporary
conf.add('seen', {});


module.exports = conf;
