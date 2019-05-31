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
conf.set('thumbnail_default_image', 'kodi-white.png');
// Thumbnail sizes (only used by image cache) - sizes are for the NEEO remote
conf.set('thumbnail_widths', {mini: 80, small: 100, tile: 215, large: 454});
// Enable image cache
conf.set('image_cache_enabled', true);

// Websocket options
// https://github.com/websockets/ws/blob/master/doc/ws.md#class-websocket
// https://nodejs.org/api/http.html#http_http_request_options_callback
conf.set('ws_socket_options',{ perMessageDeflate: true });
// https://github.com/websockets/ws/blob/master/doc/ws.md#websocketsenddata-options-callback
conf.set('ws_send_options', { compress: true });

// Display notice in Kodi when driver is connected
conf.set('kodi_greeting', {
		title: 'NEEO',
		message: 'The NEEO remote is connected',
		image: 'neeo-circle.jpg',
		displaytime: 5000
});
conf.set('directory_page_size', 32);

conf.set('api_connection_timeout', 10000);
conf.set('api_request_timeout', 10000);
conf.set('api_reconnect_interval', 30000);
conf.set('api_keepalive_interval', 30000);


// FIXME: seen is temporary
conf.add('seen', {});


module.exports = conf;
