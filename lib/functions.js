'use strict';

module.exports = {
	coalesce,
};


function coalesce(...args) {
	for (const [index, element] of args.entries()) {
		if(element !== null && element !== undefined) {
			return element;
		}
	}
}
