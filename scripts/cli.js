'use strict';

const debug = require('debug')('neeo-driver-kodi:cli');
const debug_ctrl = require('debug');
const vorpal = require('vorpal')();
const chalk = require('chalk');
const var_dump = require('var_dump');

var neeo_sdk = undefined;
var driver = undefined;
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
				case 'on':
					debug_ctrl.enable(debug_namespaces);
					debug_enabled = true;
					break;
				case 'off':
					if(debug_enabled) {
						debug_namespaces = getDebugNamespaces();
						debug_ctrl.disable();
						debug_enabled = false;
					}
					break;
				case 'debug':
					this.log(debug_ctrl);
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


vorpal
  .command('run', 'Starts the driver')
	.alias('go')
	.alias('start')
  .action(function(args, callback) {
		const cwd = process.cwd();
		process.argv.push('start');
		neeo_sdk = require('neeo-sdk/dist/cli');
		driver = require('../lib/KodiController');
    callback();
  });

vorpal
  .command('test', 'Tests something')
  .action(function(args, callback) {
//		debug(process);
		// debug(driver);
		// var driver2 = require('../lib/KodiController');
		// debug(driver2);
		// console.log(driver);
		// driver.initialise();
		var foo = require('../lib/Foo');
		console.log(foo);
  	callback();
  });


vorpal
  .delimiter('neeo-driver-kodi# ')
  .show();
