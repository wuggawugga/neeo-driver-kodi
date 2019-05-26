'use strict';

const debug = require('debug')('neeo-driver-kodi:httpInterface');
const express = require('express');
const conf = require('./Config');
const fs = require('fs');
const fileType = require('file-type');
const path_separator = require('path').sep;
const receptacle = require('./Receptacle').image_cache;
const resizeImg = require('resize-img');
const BluePromise = require('bluebird');
const controller = require('./KodiController');

var Jimp = require('jimp');


/*
 *  Very simple image server for NEEO.
 *  KodiController stores original images in Receptacle, and this service just
 *  resizes and caches them on demand.
 */

const cwd = process.cwd();
const dirs = conf.get('image_paths');
const port = conf.get('localhost.http_port') || 3042;

var app = express();
app.listen(port);
console.log('# HTTP Interface listening on port', port);

/*
 *  Simple logging middleware function
 */
app.use(function (req, res, next) {
  debug('HTTP Request', req.connection.remoteAddress, req.originalUrl);
  next();
});

/*
 *  For some reason, NEEO needs a file extension to even attempt requesting
 *  an image. This middleware function just removes the extension.
 */
app.use(function (req, res, next) {
  debug('HAI');
  req.url = req.originalUrl.replace(/([a-f0-9]{32})\.(jpg|png)/, '$1');
  next();
});

/*
 *  Returns an image scaled to the size in the request path
 */
app.get('/image/(([0-9]+))/*', async function(req, res) {
  debug('Image GET');
  try {
    var size = parseInt(req.params[0]);
    var id = req.params[1];
    var key = id + '-' + size;
    if(receptacle.has(key)) {
      debug('Serving cached resized image', size, key);
      let obj = receptacle.get(key);
      res.type(obj.type.mime).write(obj.data);
      res.end();
      return;
    } else if (receptacle.has(id)) {
      debug('Resizing cached original image', size, id);
      for(let i=0; i<10; i++) {
        debug(i);
        var obj = receptacle.get(id);
        let data = obj.data;
        if(typeof data == 'object' && data.constructor.name == 'Buffer') {
          let buffer = await resize(obj.data, size);
          res.type(obj.type.mime);
          res.write(buffer);
          res.end();
          receptacle.set(key, {type: obj.type, data: buffer});
          return;
        } else {
          await sleep(500);
        }
      }
//      var mangled = null;

//      return;

      // Jimp.read(obj.data).then((image) => {
      //   mangled = image
      //   .resize(256, 256) // resize
      //   .quality(60) // set JPEG quality
      //   .greyscale() // set greyscale
      //   .getBuffer(Jimp.MIME_JPEG, onBuffer);
      //
      //   debug(typeof mangled);
      //   if(mangled) {
      //     receptacle.set(key, {type: obj.type, data: mangled});
      //     res.type(obj.type.mime).write(mangled);
      //   } else {
      //     res.type(obj.type.mime).write(obj.data);
      //   }
      //   res.end();
      // }).catch(err => {
      //   console.error('CAUGHT');
      //   debug('OBJ', obj);
      //   debug('MANGLED', mangled);
      //   console.error(err);
      // });





    } else {
      for(var dir of dirs) {
        let path = [cwd, dir, id].join(path_separator);
        if(fs.existsSync(path)) {
          debug('Resizing image file', id);
          var file = fs.readFileSync(path);
          var type = fileType(file);
          resizeImg(file, {width: size}).then((buffer) => {
            receptacle.set(key, {type: type, data: buffer});
            res.type(type.mime).write(buffer);
            res.end();
            return;
          });
        }
      }
    }
  } catch(error) {
//    debug(res);
    console.log('HTTP Interface ERROR', error);
    res.status(500).send(error);
    return;
  }
  res.status(404).send('Not found');
//  debug(res);
});

function resize(buffer_in, size) {
  return resizeImg(buffer_in, {width: size}).then((buffer_out) => {
    return buffer_out;
  });
}

function sleep(ms) {
  return new BluePromise(resolve => setTimeout(resolve, ms));
}

// function onBuffer(err, buffer) {
//   if (err) {
//     throw err;
//     console.log('oooooooooooooooOOOOOOOOOOOOOOOOOOOOOoOOOOOOOOOOOOOOOOOOooooooooooooooooooo');
//     console.log(buffer);
//   }
// }

/*
 *  Returns an unmodified image
 */
app.get('/image/*', function (req, res) {
  var key = req.params[0];
  debug('Serving unscaled image', key);

  if(receptacle.has(key)) {
    let obj = receptacle.get(key);
    res.type(obj.type.mime).write(obj.data);
    res.end();
  } else {
    for(var dir of dirs) {
      let path = [cwd, dir, key].join(path_separator);
      if(fs.existsSync(path)) {
        res.sendFile(path);
        return;
      }
    }
  }
  res.status(404);//.send('Not found');
});

app.get('/images', function (req, res) {
  let output = '';
  let instances = conf.get('kodi_instances');
  for (let item of receptacle.items) {
    output += '<a href="/image/'+item.key+'">' + item.key + '</a><br />';
  }
  res.send(output);
});

/*
 *  Dumps a state object. Also writes to stdout for debugger.
 */
app.get('/instance/*/state', function (req, res) {
  var key = req.params[0];
  debug('Dumping state', key);

  if(controller.instances[key]) {
    res.type('text/plain').send(controller.clients[key].state.toJSON());
    console.log(controller.clients[key].state);
//    res.end();
  } else {
    res.status(404).send('Not found');
  }
});

app.get('/instance/*', function (req, res) {
  var id = req.params[0];
  let output = '';
  output += '<a href="/instance/'+id+'/state">State</a><br />';
  res.send(output);
});

/*
 *  Dumps the contents of the configuration store.
 */
app.get('/config', function (req, res) {
  debug('Configuration');
  res.type('text/plain').send(JSON.stringify(conf.all, null, 2));
});

app.get('/', function (req, res) {
  let output = '';
  output += '<a href="/config">Configuration</a><br />';
  output += '<a href="/images">Images</a><br />';
  output += '<strong>Kodi instances</strong><br />'
  let instances = conf.get('kodi_instances');
  for (const [id, instance] of Object.entries(instances)) {
    output += '<a href="/instance/'+id+'">'+ instance.name+'</a><br />';
  }
  res.send(output);
});
