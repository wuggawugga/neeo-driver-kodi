'use strict';

const debug = require('debug')('neeo-driver-kodi:cli');
const debug_ctrl = require('debug');
const vorpal = require('vorpal')();
const chalk = require('chalk');
const conf = require('../lib/Configstore');
//const var_dump = require('var_dump');

var neeo_sdk = undefined;
var kodiController = undefined;
var debug_namespaces = getDebugNamespaces();
var debug_enabled = true;

function getDebugNamespaces() {
	try {
		let namespaces = debug_ctrl.disable();
		debug_ctrl.enable(namespaces);
		return namespaces.split(',');
	} catch(error) {
		console.log(chalk.red('Error parsing DEBUG filter.'));
		debug_ctrl.disable();
		return [];
	}
}

vorpal
  .command('debug [strings...]', 'Messes with the debug settings')
  .action(function(args, callback) {
		let namespaces = debug_namespaces;
		if(args.strings) {
			switch(args.strings[0]) {
				case 'enable':
					if(args.strings.length > 1) {
						for(let arg of args.strings.slice(1)) {
							this.log('enable', arg);
							debug_ctrl.enable(arg);
						}
						debug_namespaces = getDebugNamespaces();
					}
					break;
				case 'disable':
					if(args.strings.length > 1) {
						for(let arg of args.strings.slice(1)) {
							this.log('enable', arg);
							debug_ctrl.disable(arg);
						}
						debug_namespaces = getDebugNamespaces();
					}
					break;
				case 'debug':
					this.log(debug_ctrl);
					break;
				default:
					debug_ctrl.enable(args.strings[0]);
					debug_namespaces = getDebugNamespaces();
					break;
			}
		} else {
			if(debug_enabled && debug_namespaces.length > 0) {
				this.log('Debug namespaces:');
				for(let token of debug_namespaces) {
					let status = debug_ctrl.enabled(token) ? 'Enabled:' : 'Disabled:';
					this.log('\t', status, token);
				}
			} else {
				this.log('No enabled namespaces');
			}
		}
    callback();
  });

vorpal.find('exit').alias('q')
	.alias('bye')
	.action(function(args, callback) {
	console.log('KTHXBAI');
	process.exit(0);
	callback();
});

vorpal
  .command('run', 'Starts the driver')
	.alias('go')
	.alias('start')
  .action(function(args, callback) {
		const cwd = process.cwd();
		process.argv.push('start');
		neeo_sdk = require('neeo-sdk/dist/cli');
		kodiController = require('../lib/KodiController');
    callback();
  });


/*

*/

var kodi_instances = conf.get('kodi_instances');
var kodi_ids = [];
var kodi_names = [];
var kodi_map = {};
let i = conf.get('kodi_instances');
for (const [id, instance] of Object.entries(kodi_instances)) {
	kodi_ids.push(id);
	kodi_names.push(instance.name);
	kodi_map[instance.name] = id;
}

vorpal
  .command('show [name]', 'Shows something')
	.autocomplete(kodi_names)
  .action(function(args, callback) {
		if(kodiController) {
			let s = kodiController.clients[kodi_map[args.name]].state;
			let kodiState = {
				state: s.state,
				media: s.media,
				players: s.players
			};
			console.log(kodiState);
		}
  	callback();
  });

vorpal
  .command('test', 'Tests something')
  .action(function(args, callback) {
		console.log(vorpal);
  	callback();
  });

var running = true;
vorpal.on('keypress', function(key, value, e) {
	let typing = vorpal.ui.input().trim().length > 0;
	if(key.key == 'space' && !typing) {
		if(running) {
			running = false;
			vorpal.ui.delimiter('* ' + chalk.blue('DEBUG PAUSED') + ' neeo-driver-kodi# ')
			debug_namespaces = debug_ctrl.disable();
		} else {
			running = true;
			vorpal.ui.delimiter('neeo-driver-kodi# ')
			debug_ctrl.enable(debug_namespaces);
		}
		vorpal.ui.input('');
	}
});

console.log('Type "run" to start the driver.');
console.log('Use [SPACE] to toggle debug output.');

vorpal
  .delimiter('neeo-driver-kodi# ')
  .show();
