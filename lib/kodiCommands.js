'use strict';

var command = { name: '', method: '', params: {}, cac: false};

var commands = {
	BACK: { ...command, name: 'Back', method: 'Input.Back' },
	CURSOR_UP: { ...command, name: 'Cursor up', method: 'Input.up' },
	CURSOR_DOWN: { ...command, name: 'Cursor down', method: 'Input.down' },
	CURSOR_LEFT: { ...command, name: 'Cursor left', method: 'Input.left' },
	CURSOR_RIGHT: { ...command, name: 'Cursor right', method: 'Input.right' },
	SELECT: { ...command, name: 'Select', method: 'Input.select' },
};

//console.log(commands);

module.exports = commands;
