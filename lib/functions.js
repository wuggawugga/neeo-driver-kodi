'use strict';

const crypto = require('crypto');

module.exports = {
	md5
}


function md5(input) {
  const hash = crypto.createHash('md5');
  hash.update(input);
  return(hash.digest('hex'));
}
