/**
 * Created by govind on 5/1/17.
 */


var _ = require('lodash');
const uuidv4 = require('uuid/v4'); // Ramdon UUID generator
var time = require('time')(Date);
var fs = require('fs');

var esIndicesConfig = require('./elasticsearch/esIndicesConfig');
var esclient = require('./elasticsearch/esclient');

// Use Busboy to parse form-data from the uploaded file content.
var Busboy = require('busboy');

var Map = require('hashtable');

var hashtable_buckets = new Map();
var hashtable_OSDs = new Map();
var staging_bucket = "staging";

var HPStorageManager = {

  init: function(){

    let allIndices = _.assign({}, esIndicesConfig.storagemanagerIndices);
    esclient.initIndices(allIndices, function(){
      console.log("init - inside callback");

      HPStorageManager.loadBucketsTable(function(){
        HPStorageManager.loadOSDTable(function(){

          // TEST CODE TO BE REMOVED
          // HPStorageManager.createFile(hashtable_buckets.get(staging_bucket), "abc");
          HPStorageManager.moveobject('306d78e2-58f9-45d3-bdc8-e7f339e9bef7', 'staging', 'media1', function(){
            console.log("@@@@@@@@@@@@@@");
          });

        });

      });

    });

  },

  loadBucketsTable: function(callback) {
    console.log("loadBucketsTable");

    esclient.getItems("sm_oscontainersindex", {}, {}, function(err, result){
      // console.log("loadBucketsTable result: ", JSON.stringify(result.items));

      result.items.map((bucketitem) => {

        // console.log("===>", bucketitem);
        hashtable_buckets.put(bucketitem.id, bucketitem);
      });

      console.log("hashmap size is: ", hashtable_buckets.size());
      callback();
      // console.log("hashmap for media1: ", hashtable_buckets.get("media1"));

    });

  },

  loadOSDTable: function(callback) {
    console.log("loadOSDTable");

    esclient.getItems("sm_osdindex", {}, {}, function(err, result){
      // console.log("loadOSDTable result: ", JSON.stringify(result.items));
      result.items.map((osditem) => {

        // console.log("===>", osditem);
        hashtable_OSDs.put(osditem.id, osditem);
      });

      console.log("hashmap size is: ", hashtable_OSDs.size());
      callback();
      // console.log("hashmap for media1: ", hashtable_buckets.get("media1"));

    });
  },

  addNewFileIndex: function( id, filedata, callback1) {

    console.log("esclient::stageNewFiles filedata: ", filedata);

    // let data = esIndicesConfig.storagemanagerIndices.sm_objectstoreindex;
    // data.id = id;
    // data.body = filedata;
    // data.body.status = "staging";
    //
    // console.log("esclient::sm_objectstoreindex data: ", data);

    esclient.addItem('sm_objectstoreindex', filedata, id, callback1);
  },

  createFile: function(bucket, objID) {

    console.log("createFile bucket objID: ", objID);
    console.log("createFile bucket: ", bucket);
    console.log("createFile number of osds in bucket: ", bucket.osds.length);

    var osdcount = bucket.osds.length;



    // pick an osd randomly from the list of osds assigned to the bucket
    var osdpicked = Math.floor((Math.random() * osdcount) );

    console.log("OSD picked: ", bucket.osds[osdpicked]);

    var osd = hashtable_OSDs.get( bucket.osds[osdpicked]);

    console.log("osd: ", osd);

    if(osd['device-type'] == 'localSDD') {
      return HPStorageManager.createFile_localSDD(osd, objID);
    }

  },

  getFile: function(bucket, objID, callback) {

    console.log("getFile bucket.osds: ", bucket.osds);

    bucket.osds.map((osd) => {
      console.log("each osd: ", osd);
      let osddata = hashtable_OSDs.get(osd);
      console.log("osd data: ", JSON.stringify(osddata));
      let path = osddata.path;
      console.log("path: ", path);

      if(fs.existsSync(path + '/' + objID)) {
        console.log("file exists!!!!!!!!!!!!!!", path + '/' + objID);
        return fs.createReadStream(path + '/' + objID);
      }
    });

  },

  createFile_localSDD: function (osd, objID) {

    console.log("createFile_localSDD: ", osd, " objID: ", objID);

    return fs.createWriteStream(osd['path'] + '/' + objID);


  },


  addfile: function (req, res) {
    var localOSD = require('./OSDAccess/localstorage');

    //  First generate UUID for new file's ObjID
    let objID = uuidv4();

    // Create a writable stream
    //   var writerStream = fs.createWriteStream(objID);
    let bucket = hashtable_buckets.get(staging_bucket);

    var writerStream = HPStorageManager.createFile(bucket, objID);


    var busboy = new Busboy({headers: req.headers});

    //containerid = 1 for persistent storage
    var filedata = {size: 0, status: 'staging', container: 'staging'};

    var d = new Date();
    d.setTimezone('UTC');

    filedata.import_date = d.toString();



    busboy.on('file', function(fieldname, file, filename, encoding, mimetype) {
      console.log('File [' + fieldname + ']: filename: ' + filename + ', encoding: ' + encoding + ', mimetype: ' + mimetype);

      filedata.orgfilename = filename;
      filedata.encoding = encoding;
      filedata.mimetype = mimetype;

      file.on('data', function(data) {
        console.log('File [' + fieldname + '] got ' + data.length + ' bytes');
        filedata.size += data.length;
        writerStream.write(data);
      });
      file.on('end', function() {
        console.log('on end File [' + fieldname + '] Finished');
      });
    });

    busboy.on('field', function(fieldname, val, fieldnameTruncated, valTruncated, encoding, mimetype) {
      console.log('on Field [' + fieldname + ']: value: ' + inspect(val));
    });

    busboy.on('finish', function() {
      console.log('Done parsing form!');
      writerStream.end();
      res.writeHead(303, { Connection: 'close', Location: '/' });
      res.end();

      //  Add file record in objectstorageindex.
      HPStorageManager.addNewFileIndex(objID, filedata, function(){

      })
    });

    busboy.on('error', function() {
      console.log('Error parsing form!');
      writerStream.end();
      res.writeHead(303, { Connection: 'close', Location: '/' });
      res.end();
    });
    req.pipe(busboy);


  },

  moveobject: function(objID, frombucket, tobucket, callback) {

    var tobucketObj = hashtable_buckets.get(tobucket);
    var frombucketObj = hashtable_buckets.get(frombucket);

    esclient.getItem("sm_objectstoreindex", objID, {'match': {'container': frombucket}}, function(err, resp){
      console.log("moveobject: ", resp);
      console.log("moveobject from bucket: ", frombucketObj);
      var readstream = HPStorageManager.getFile(frombucketObj, objID);
      var writerstream = HPStorageManager.createFile(tobucketObj, objID);
      // readstream.pipe(writerstream);
    //  TODO: INCOMPLETE IMPLEMENTATION

    });

  },

  getobjects: function(bucket, query, callback) {

    esclient.getItems('sm_objectstoreindex', {}, {'match': {'container': bucket}}, function(err, result){

      console.log("getObjects: result: ", JSON.stringify(result));
      callback(err, result);

    });

  },



};

module.exports = HPStorageManager;
