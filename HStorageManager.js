/**
 * Created by govind on 5/1/17.
 */


var _ = require('lodash');
const uuidv4 = require('uuid/v4'); // Ramdon UUID generator
var time = require('time')(Date);
var fs = require('fs');

var esIndicesConfig = require('./elasticsearch/esIndicesConfig');
var esclient = require('./elasticsearch/esclient');
var localOSD = require('./OSDAccess/localstorage');
var localSSD = require('./OSDAccess/localSDD');

// Use Busboy to parse form-data from the uploaded file content.
var Busboy = require('busboy');

var Map = require('hashtable');

var hashtable_buckets = new Map();
var hashtable_OSDs = new Map();
var staging_bucket = "staging";

var HStorageManager = {

  init: function(){

    let allIndices = _.assign({}, esIndicesConfig.storagemanagerIndices);
    esclient.initIndices(allIndices, function(){
      console.log("init - inside callback");

      HStorageManager.loadBucketsTable(function(){
        HStorageManager.loadOSDTable(function(){

          // // TEST CODE TO BE REMOVED
          // HStorageManager.getFile("staging", "314b9738-416f-44d9-87e2-92d7007a95f5", function(err, result){
          //
          // });
          // // HStorageManager.createFile(hashtable_buckets.get(staging_bucket), "abc");
          // HStorageManager.moveobject('306d78e2-58f9-45d3-bdc8-e7f339e9bef7', 'staging', 'media1', function(){
          //   console.log("@@@@@@@@@@@@@@");
          // });

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

  addNewFileIndex: function( bucket, filedata, callback1) {

    console.log("esclient::addNewFileIndex filedata: ", filedata);

    // let data = esIndicesConfig.storagemanagerIndices.sm_objectstoreindex;
    // data.id = id;
    // data.body = filedata;
    // data.body.status = "staging";
    //
    // console.log("esclient::sm_objectstoreindex data: ", data);
    var bucket_index = "sm_objectstoreindex" + "_" + bucket;

    esclient.addItem(bucket_index, filedata, filedata.id, callback1);
  },

  createNewFile: function(bucket, callback) {

    console.log("createNewFile bucket: ", bucket);
    console.log("createNewFile number of osds in bucket: ", bucket.osds.length);

    //  First generate UUID for new file's ObjID
    let objID = uuidv4();
    var filedata = {id: objID, size: 0, status: 'staging', container: 'staging'};

    // import date of the file
    var d = new Date();
    d.setTimezone('UTC');
    // get current time in ISO8601 format which supports lexicographical sorting
    // Ref: https://en.wikipedia.org/wiki/ISO_8601
    filedata.import_date = d.toISOString();

    HStorageManager.createFile(bucket, filedata, callback);

  },

  createFile: function(bucket, filedata, callback) {

    console.log("createFile bucket: ", bucket);
    console.log("createFile number of osds in bucket: ", bucket.osds.length);

    var osdcount = bucket.osds.length;

    // pick an osd randomly from the list of osds assigned to the bucket
    var osdpicked = Math.floor((Math.random() * osdcount) );

    console.log("OSD picked: ", bucket.osds[osdpicked]);

    var osd = hashtable_OSDs.get( bucket.osds[osdpicked]);

    console.log("osd: ", osd);

    if(osd['device-type'] == 'localSDD') {

      HStorageManager.createFile_localSDD(osd, filedata, callback);

    }
    else if (osd['device-type'] == 'localHDD') {

      HStorageManager.createFile_localHDD(osd, filedata, callback);

    }
    else
    {
      console.log("createFile: ", osd['device-type'], "not valid osd!");
      callback();
    }


  },

  getFile: function(bucket, objID, callback) {

    console.log("getFile: bucket: ", bucket);
    console.log("getFile: objID: ", objID);

    let bucketObj = hashtable_buckets.get(bucket);

    var bucket_index = "sm_objectstoreindex" + "_" + bucket;

    // esclient.getItem(bucket_index, objID, {"match_all":{}}, function(err, result){
    esclient.getItem(bucket_index, objID, {"match":{"id": objID}}, function(err, result){
      console.log("getFile: result: ", JSON.stringify(result));
      console.log("getFile: result: ", result.size);

      var filestream = HStorageManager.getFileFromPath(result['path']);

      callback( undefined, filestream, result);
    });

    // localOSD.readFile(bucket, osd, objID);
    //
    // console.log("getFile: input bucket: ", bucket);
    //
    // console.log("getFile bucket.osds: ", bucketObj);
    //
    // bucketObj.osds.map((osd) => {
    //   console.log("each osd: ", osd);
    //   let osddata = hashtable_OSDs.get(osd);
    //   console.log("osd data: ", JSON.stringify(osddata));
    //   let path = osddata.path;
    //   console.log("path: ", path);
    //
    //   if(fs.existsSync(path + '/' + objID)) {
    //     console.log("file exists!!!!!!!!!!!!!!", path + '/' + objID);
    //
    //     callback( undefined, fs.createReadStream(path + '/' + objID), {'size': 202022});
    //   }
    // });

  },

  getFileFromPath: function(path) {
    console.log("getFileFromPath: path: ", path);

    var array = path.split(':');

    if(array.length === 2) {
      let osd = hashtable_OSDs.get(array[0]);

      console.log("getFileFromPath: hashtable_osds: ", hashtable_OSDs.keys().toString());
      console.log("getFileFromPath: array: ", array);
      console.log("getFileFromPath: osd: ", osd);
      let filepath = osd.path + "/" + array[1];

      console.log("getFileFromPath: actual file path is: ", filepath);

      if(osd['device-type'] === "localSDD") {
        return localSSD.readFile(osd, array[1]);
        
      }
      else {
        console.log("getFileFromPath: unsupported OSD device type: ", osd.device-type);
      }

    }
    else {
      console.log("getFileFromPath: Invalid path: ", path);
    }


      return undefined;
  },

  createFile_localSDD: function (osd, filemeta, callback) {

    console.log("createFile_localSDD: ", osd, " objID: ", filemeta.objID, " filemeta: ", filemeta);
    // filemeta.path = osd['path'] + '/' + filemeta.id;
    filemeta.path = osd['id'] + ':' + filemeta.id;

    callback(fs.createWriteStream(osd['path'] + '/' + filemeta.id), filemeta);

  },
  createFile_localHDD: function (osd, filemeta, callback) {

    console.log("createFile_localHDD: ", osd, " objID: ", filemeta.objID, " filemeta: ", filemeta);
    // filemeta.path = osd['path'] + '/' + filemeta.id;
    filemeta.path = osd['id'] + ':' + filemeta.id;

    callback(fs.createWriteStream(osd['path'] + '/' + filemeta.id), filemeta);

  },

  /**
   * Method: addfile
   * @param req
   * @param res
   *
   * Description:
   */
  addfile: function (req, res) {


    // First add the file to staging area for extracting file meta data before moving it to persistent storage
    // Create a writable stream
    //   var writerStream = fs.createWriteStream(objID);
    let bucketObj = hashtable_buckets.get(staging_bucket);

    HStorageManager.createNewFile(bucketObj, function(writerStream, filedata){

      var busboy = new Busboy({headers: req.headers});

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
        HStorageManager.addNewFileIndex(bucketObj.id, filedata, function(){

          console.log("addfile: addNewFileIndex: ");

        });

      });

      busboy.on('error', function() {
        console.log('Error parsing form!');
        writerStream.end();
        res.writeHead(303, { Connection: 'close', Location: '/' });
        res.end();
      });

      req.pipe(busboy);

    });

  },

  _addfile: function (bucket, metadata, filestream, callback) {

    console.log("_addfile: bucket: ", bucket);
    console.log("_addfile: metadata: ", metadata);

    let bucketObj = hashtable_buckets.get(bucket);

    HStorageManager.createFile(bucketObj, metadata, function(writerStream, filedata){

      filestream.pipe(writerStream);

      //  Add file record in objectstorageindex.
      HStorageManager.addNewFileIndex(bucketObj. id, filedata, function(){

        console.log("_addfile: addNewFileIndex: ");
        callback(undefined, filedata);

      });

    });


  },

  _mergeMetaData: function (medatada1, metadata2) {

  },

  moveobject: function(objID, frombucket, tobucket, callback) {

    var tobucketObj = hashtable_buckets.get(tobucket);
    var frombucketObj = hashtable_buckets.get(frombucket);

    var tobucket_index = "sm_objectstoreindex" + "_" + tobucket;
    var frombucket_index = "sm_objectstoreindex" + "_" + frombucket;


    esclient.getItem(frombucket_index, objID, {'match': {'container': frombucket}}, function(err, resp){
      console.log("moveobject: ", resp);
      console.log("moveobject from bucket: ", frombucketObj);
      // var readstream = HStorageManager.getFile(frombucketObj, objID);
      // var writerstream = HStorageManager.createFile(tobucketObj, objID);
      // readstream.pipe(writerstream);
    //  TODO: INCOMPLETE IMPLEMENTATION

    });

  },

  getobjects: function(bucket, query, callback) {

    console.log("getobjects: bucket: ", bucket);
    console.log("getobjects: query: ", query);

    esclient.getItems('sm_objectstoreindex_' + bucket, {}, {'query': query}, function(err, result){

      console.log("getObjects: result: ", JSON.stringify(result));
      callback(err, result);

    });

  },

  bulkupdate: function(arrUpdateItems, callback) {

    console.log("bulkupdate: ", arrUpdateItems);

    var arrESUpdateItems = [];

    arrUpdateItems.map(( updateItem) => {

      console.log("updateItem: ", updateItem);

      var indexname = HStorageManager.getIndexForBucket(updateItem['container']);

      var index = {'update': {'_index': indexname, '_type': indexname, '_id': updateItem.id}};
      var doc = {'doc': updateItem};

      arrESUpdateItems = arrESUpdateItems.concat([index, doc]);

    });

    console.log("bulkupdate: arrESUpdateItems: ", arrESUpdateItems);

    esclient.bulkupdate(arrESUpdateItems, function(err, resp){
      console.log("bulkupdate: callback err: ", err);
      console.log("bulkupdate: callback resp: ", resp);
      callback(err, resp);
    });

  },

  bulkmove: function(arrUpdateItems, callback) {

    console.log("bulkmove: ", arrUpdateItems);

    let promises = arrUpdateItems.map((item) => {

      console.log("bulkmove: ", item);
      return HStorageManager.getFile(item.sourcebucket, item.id, function(err, filestream, metadata){

        console.log("bulkmove: err: ", err);
        console.log("bulkmove: metadata: ", metadata);

        metadata.container = item.targetbucket;
        metadata.status = "online"; // this document will not be online

        return HStorageManager._addfile(item.targetbucket, metadata, filestream, function(err, resp){


        });

      });

    });

    Promise.all(promises).then((results) => {
      console.log("bulkmove: promises results: ". results);
      callback();

    });



    // copy the file from source bucket to target bucket


  },

  getIndexForBucket: function(bucket) {
    if(bucket == "staging") {
      return "sm_objectstoreindex_staging";
    } else if(bucket == "media1"){
      return "sm_objectstoreindex_media1";

    }
  }



};

module.exports = HStorageManager;