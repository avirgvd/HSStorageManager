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
var storagemanager = require('./HStorageManager');
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
// app.use(bodyParser.json({}));
// limit is set to a number in order to allow large file uploads
app.use(bodyParser({limit: '50gb'}));
app.use(bodyParser.urlencoded({limit: '50gb'}));
app.use(bodyParser());



/*
 * handler for http get requests for the file using object-id.
 * The GET request should be typically like http://hostname:3000/<filename>
 * The request param 'file' has the file name to fetch
 * */
app.get('/rest/:bucket/:file', function(req, resp){
  console.log("get query: ", req.query);
  console.log("get params: ", req.params);
  console.log("get file: ", req.params.file);

  var params = req.params;

  storagemanager.getFile(params.bucket, params.file, req.query, function(err, filestream, filemeta){

    console.log("GET /rest/:bucket/:file filemeta: ", filemeta);

    if(filestream != undefined) {
      resp.setHeader('Content-Type', filemeta.mimetype);
      resp.setHeader('Content-Length', filemeta.size);
      filestream.pipe(resp);
    }
    else{
      resp.json({"result": "empty"});
    }

  });

});


// Moves specified file using ObjID to a target bucket and update object index
app.post('/rest/bulkmove', function(req, resp){

  var params = req.params;
  var body = req.body;
  console.log("/rest/bunkmove request params: ", params);
  console.log("/rest/bunkmove request body: ", body);

  storagemanager.bulkmove(body, function(err, result){
    resp.json({"result": "done"});
  });

});

// Moves specified file using ObjID to a target bucket and update object index
app.post('/rest/bulkupdate', function(req, resp){

  var params = req.params;
  var body = req.body;
  console.log("/rest/bulkupdate request params: ", params);
  console.log("/rest/bulkupdate request body: ", body);

  storagemanager.bulkupdate(body, function(err, result){
    resp.json({"result": "done"});
  });

});

app.post('/rest/objects', function(req, resp){

  console.log("POST /rest/objects req.body: ", req.body);

  var params = req.body.params;
  var query = req.body.query;

  storagemanager.getobjects(params.bucket, query, function(err, result){
    resp.json({result: result});
  });

});

app.post('/rest/file', function(req, resp){

  console.log("POST /rest/file req.body: ", req.body);

  var params = req.body.params;

  storagemanager.getFile(params.bucket, params.objid, {}, function(err, filestream, filemeta){

    console.log("POST /rest/file filemeta: ", filemeta);

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
  console.log("####write file params: ", req.params);

//  The target container should be "PERSISTENT_STORAGE" by default unless specified in request body


  storagemanager.addfiles(req, res);



});

storagemanager.init();


app.listen(3040,function(){
  console.log("Working on port 3040");
});