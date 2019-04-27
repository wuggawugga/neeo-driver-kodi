const conf = require('../lib/Configstore');
const var_dump = require('var_dump');

console.log('Config has ' + conf.size + ' items');

data = conf.all;

for (key in data) {
  console.log(key);
	var_dump(data[key]);
}
