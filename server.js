/**
 * Created by govind on 2/18/17.
 */

/**
 * Very good artical about streams in Node.js and JavaScripts
 * https://www.tutorialspoint.com/nodejs/nodejs_streams.htm
 * https://nodejs.org/api/stream.html
 *
 */

var express = require("express");
var bodyParser = require('body-parser');
var storagemanager = require('./HPStorageManager');
var fs = require('fs');

var app = express();

// The below code is required to enable Cross Origin REST Calls
// This is required as REST server listens on 3040 port
// where as the front-end's server listens on 3000
app.use(function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  next();
});

// parse application/json
// To parse body coming with POST requests
// Without this body will not be accessible in POST request handlers
app.use(bodyParser.json());

/*
 * handler for http get requests for the file using object-id.
 * The GET request should be typically like http://hostname:3000/<filename>
 * The request param 'file' has the file name to fetch
 * */
app.get('/rest/:file', function(req, resp){
  console.log("get query: ", req.query);
  console.log("get params: ", req.params);
  console.log("get file: ", req.params.file);

  // getObjectMeta(req.params.file);

  var file = '/home/govind/HomeServer/storage/staging/' + req.params.file;

  if(req.query.hasOwnProperty('size')) {
  }

  var filestream = fs.createReadStream(file);
  filestream.pipe(resp);

});


// Moves specified file using ObjID to a target bucket and update object index
app.post('/rest/move', function(req, resp){

  var params = req.params;
  console.log("request params: ", params);

  storagemanager.moveobject(params.objID, params.bucket);

});

app.post('/rest/objects', function(req, resp){

  console.log("POST /rest/objects req.body: ", req.body);

  var params = req.body.params;

  storagemanager.getobjects(params.bucket, {}, function(err, result){
    resp.json({result: result});
  });


});

app.post('/rest/file', function(req, resp){

  console.log("POST /rest/objects req.body: ", req.body);

  var params = req.body.params;

  storagemanager.getFile(params.bucket, params.objid, function(err, filestream, filemeta){

    resp.setHeader('Content-Type', filemeta.mimetype);
    resp.setHeader('Content-Length', filemeta.size);
    filestream.pipe(resp);
  });

});


/**
 * This is handler for upload files action from the UI
 */
app.post('/rest/upload', function(req, res){
  // console.log("####get params: ", req);
  console.log("####write file: ", req.headers);

//  The target container should be "PERSISTENT_STORAGE" by default unless specified in request body


  storagemanager.addfile(req, res);



});

storagemanager.init();


app.listen(3040,function(){
  console.log("Working on port 3040");
});