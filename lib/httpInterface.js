'use strict';

const debug = require('debug')('neeo-driver-kodi:httpInterface');
const express = require('express');
const conf = require('./Configstore');
const fs = require('fs');
const fileType = require('file-type');
const path_separator = require('path').sep;
const receptacle = require('./Receptacle');
const resizeImg = require('resize-img');
const BluePromise = require('bluebird');
const controller = require('./KodiController');

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
  req.url = req.originalUrl.replace(/([a-f0-9]{32})\.(jpg|png)/, '$1');
  next();
});

/*
 *  Returns an image scaled to the size in the request path
 */
app.get('/image/(([0-9]+))/*', function(req, res) {
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
      var obj = receptacle.get(id);
      resizeImg(obj.data, {width: size}).then((buffer) => {
        receptacle.set(key, {type: obj.type, data: buffer});
        res.type(obj.type.mime).write(buffer);
        res.end();
      });
      return;
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
          });
          return;
        }
      }
    }
    res.status(404).send('Not found');
  } catch(error) {
    console.log('HTTP Interface ERROR', error);
    res.status(500).send(error);
  }
})

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
  res.status(404).send('Not found');
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

app.get('/', function (req, res) {
  let output = '';
  let instances = conf.get('kodi_instances');
  for (const [id, instance] of Object.entries(instances)) {
    output += '<a href="/instance/'+id+'/state">'+ instance.name+'</a><br />';
  }
  res.send(output);
});
