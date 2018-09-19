/**
 * Created by govind on 5/1/17.
 */


var _ = require('lodash');
const uuidv4 = require('uuid/v4'); // Ramdon UUID generator
var time = require('time')(Date);
var fs = require('fs');

var esIndicesConfig = require('../elasticsearch/esIndicesConfig');
var esclient = require('../elasticsearch/esclient');
var localOSD = require('./osd/localstorage');
var localSSD = require('./osd/localSDD');

var hsthumbnails = require('../thumbnail/HSThumbnails');

// Use Busboy to parse form-data from the uploaded file content.
var Busboy = require('busboy');

var Map = require('hashtable');

var hashtable_buckets = new Map();
var hashtable_OSDs = new Map();
var staging_bucket = "staging";

var StorageMain = {

  init: function(){

    let allIndices = _.assign({}, esIndicesConfig.storagemanagerIndices);
    esclient.initIndices(allIndices, function(){
      console.log("init - inside callback");

      StorageMain.loadBucketsTable(function(){
        StorageMain.loadOSDTable(function(){

          // // TEST CODE TO BE REMOVED
          // StorageMain.getFile("staging", "314b9738-416f-44d9-87e2-92d7007a95f5", function(err, result){
          //
          // });
          // // StorageMain.createFile(hashtable_buckets.get(staging_bucket), "abc");
          // StorageMain.moveobject('306d78e2-58f9-45d3-bdc8-e7f339e9bef7', 'staging', 'media1', function(){
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

    esclient.addItem(bucket_index, filedata, filedata.id, function(err, resp){
      callback1(err, resp);
    });
  },

  createNewFile: function(bucket, filedata, callback) {

    console.log("createNewFile bucket: ", bucket);
    // console.log("createNewFile number of osds in bucket: ", bucket.osds.length);

    //  First generate UUID for new file's ObjID
    let objID = uuidv4();
    // var filedata = {id: objID, size: 0, status: 'staging', container: 'staging'};
    filedata['id'] = objID;
    filedata['size'] = 0;
    filedata['status'] = 'staging';
    filedata['container'] = 'staging';


    // import date of the file
    var d = new Date();
    d.setTimezone('UTC');
    // get current time in ISO8601 format which supports lexicographical sorting
    // Ref: https://en.wikipedia.org/wiki/ISO_8601
    filedata.import_date = d.toISOString();

    StorageMain.createFile(bucket, filedata, callback);

  },

  createFile: function(bucket, filedata, callback) {

    console.log("createFile: bucket: ", bucket);
    console.log("createFile: filedata: ", filedata);

    var bucketObj = hashtable_buckets.get(bucket);


    var osdcount = bucketObj.osds.length;

    // pick an osd randomly from the list of osds assigned to the bucketObj
    var osdpicked = Math.floor((Math.random() * osdcount) );

    console.log("OSD picked: ", bucketObj.osds[osdpicked]);

    var osd = hashtable_OSDs.get( bucketObj.osds[osdpicked]);

    console.log("osd: ", osd);

    if(osd['device-type'] == 'localSDD') {

      // StorageMain.createFile_localSDD(osd, filedata, callback);
      localSSD.createFile(osd, bucketObj, filedata, callback);

    }
    else if (osd['device-type'] == 'localHDD') {

      localOSD.createFile(osd, bucketObj, filedata, callback);

    }
    else
    {
      console.log("createFile: ", osd['device-type'], "not valid osd!");
      callback();
    }

  },


  getObjectMeta: function(bucket, fileID, callback) {
    console.log("getFileMeta: bucket: ", bucket);
    console.log("getObjectMeta: fileID: ", fileID);

    esclient.getItem("sm_objectstoreindex_" + bucket, fileID, {"match":{"id": fileID}}, callback);

  },


  getFile: function(bucket, objID, query, callback) {

    console.log("getFile: bucket: ", bucket);
    console.log("getFile: objID: ", objID);

    let bucketObj = hashtable_buckets.get(bucket);

    var bucket_index = "sm_objectstoreindex_" + bucket;

    if(query['size'] === "small") {
      // try thumbnails bucket
      // return the file if found in thumbnails
      // if not found then create thumbnail and then return it
      var thumbnailmeta = hsthumbnails.lookup(objID);

      console.log("getFile: thumbnail cache entry for objID: ", thumbnailmeta);

      if(thumbnailmeta != undefined) {
        // Thumbnail found in the cache
        console.log("getFile: Thumbnail found in the cache!!!");
        var filestream = StorageMain.getFileFromPath(thumbnailmeta['path']);
        callback(undefined, filestream, thumbnailmeta);

      }
      else {
        console.log("getFile: Thumbnail NOT in cache!!!");
        // esclient.getItem(bucket_index, objID, {"match_all":{}}, function(err, result){
        esclient.getItem(bucket_index, objID, {"match":{"id": objID}}, function(err, result){
          console.log("getFile: result size: ", result.size);

          var filestream = StorageMain.getFileFromPath(result['path']);
          
          var thumbnailstream = hsthumbnails.getThumbnail(result["mimetype"], filestream);

          // The thumbnail doesnt exist so create one
          // Now save this thumbnail to the bucket for thumbnails same time this file read stream is returned to caller

          StorageMain._addfile("thumbnails", {'id': objID}, thumbnailstream , function(err, resp){

            console.log("getFile: added to thumbnails: ", resp);

            // modify the path with path in thumbnails bucket
            result['path'] = resp['path'];
            result['size'] = resp['size'];
            result['mimetype'] = "image/jpeg";


            hsthumbnails.addthumbnail(objID, result);

            var filestream1 = StorageMain.getFileFromPath(result['path']);

            callback(undefined, filestream1 , result);


          });
        });

      }

    }
    else {
      // esclient.getItem(bucket_index, objID, {"match_all":{}}, function(err, result){
      esclient.getItem(bucket_index, objID, {"match":{"id": objID}}, function(err, result){
        console.log("getFile: result: ", result['size']);

        if(result.hasOwnProperty('path')) {
          var filestream = StorageMain.getFileFromPath(result['path']);

          console.log("DDDDDDDD result: ". result);

          callback( undefined, filestream, result);

        }
        else {

          callback( {error: "nothing found"}, undefined, {});

        }

      });
    }

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
      else if(osd['device-type'] === "localHDD") {
        return localOSD.readFile(osd, array[1]);

      }
      else {
        console.log("getFileFromPath: unsupported OSD device type: ", osd['device-type']);
      }

    }
    else {
      console.log("getFileFromPath: Invalid path: ", path);
    }


      return undefined;
  },

  // createFile_localSDD: function (osd, filemeta, callback) {

  //   console.log("createFile_localSDD: ", osd, " objID: ", filemeta.objID, " filemeta: ", filemeta);
  //   // filemeta.path = osd['path'] + '/' + filemeta.id;
  //   filemeta.path = osd['id'] + ':' + filemeta.objID;

  //   callback(fs.createWriteStream(osd['path'] + '/' + filemeta.objID), filemeta);

  // },
  // createFile_localHDD: function (osd, filemeta, callback) {

  //   console.log("createFile_localHDD: ", osd, " objID: ", filemeta.objID, " filemeta: ", filemeta);
  //   // filemeta.path = osd['path'] + '/' + filemeta.id;
  //   filemeta.path = osd['id'] + ':' + filemeta.objID;

  //   callback(fs.createWriteStream(osd['path'] + '/' + filemeta.id), filemeta);

  // },

  // The multipart mime type is used when the files are submitted from forms.
  // This function handles file upload requests from web browser clients
  addFile_Multipart: function (req, res, context) {
    console.log("addFile_Miltipart: ");

    // First add the file to staging area for extracting file meta data before moving it to persistent storage
    // Create a writable stream
    //   var writerStream = fs.createWriteStream(objID);
    let bucketObj = hashtable_buckets.get(staging_bucket);


    var busboy = new Busboy({headers: req.headers});
    var returnfiledata = {};
    var fieldData = context;

    busboy.on('file', function(fieldname, file, filename, encoding, mimetype) {
      console.log('File [' + fieldname + ']: filename: ' + filename + ', encoding: ' + encoding + ', mimetype: ' + mimetype );

      // StorageMain.createNewFile(bucketObj, function(writerStream, filedata){
      StorageMain.createNewFile(staging_bucket, {}, function(writerStream, filedata){
        console.log("addFile_Multipart: created the file: ", filedata);

        filedata.orgfilename = filename;
        filedata.encoding = encoding;
        filedata.mimetype = mimetype;
        filedata.params = {};

        file.pipe(writerStream);

        file.on('data', function(data) {
          console.log('File [' + filedata.id + '] got ' + data.length + ' bytes');
          filedata.size += data.length;
        });

        file.on('end', function() {
          console.log('on end File [' + filedata.id + '] Finished');
          console.log('on end File : ', fieldData);

          filedata.category = fieldData.category;
          filedata.directory = fieldData.directory;

          returnfiledata = filedata;
          // var promise = writerStream.close();
          // Add file record in objectstorageindex.
          StorageMain.addNewFileIndex(bucketObj.id, filedata, function(){

            console.log("addFile_Multipart: addNewFileIndex: ");

          });
        });
      });

    });

    busboy.on('field', function(fieldname, val, fieldnameTruncated, valTruncated, encoding, mimetype) {
      console.log('on Field [' + fieldname + ']: value: ' + val);

      // fieldData = JSON.parse(val);
    });

    busboy.on('finish', function() {
      console.log('Done parsing form!');
      // writerStream.end();
      res.writeHead(303, { Connection: 'close', FileData : {returnfiledata} });
      res.end();


    });

    busboy.on('error', function() {
      console.log('Error parsing form!');
      writerStream.end();
      res.writeHead(303, { Connection: 'error', FileData: {} });
      res.end();
    });

    req.pipe(busboy);

  },

  // This function handles fileupload requests made using rest calls
  addFile_RestCall: function (req, res) {

    // For fileupload using REST Call expect the file metadata in the headers with property 'metadata'
    console.log("addFile_RestCall: metadata", req.headers['metadata']);

    // First add the file to staging area for extracting file meta data before moving it to persistent storage
    // Create a writable stream
    //   var writerStream = fs.createWriteStream(objID);
    let bucketObj = hashtable_buckets.get(staging_bucket);


    var filesize = 0;

    StorageMain.createNewFile(staging_bucket, JSON.parse(req.headers['metadata']), function(writerStream, filedata){

      req.on('data', function(chunk) {

        console.log("^^^^^^^^^^^^^^^^^^^^^^^^^^");
        writerStream.write(chunk);
        filesize += chunk.length;

        console.log("#########Size so far is: ", filesize);
      }).on('end', function() {
        console.log("Ended................");
        console.log("%%%%%%%%%%% before addNewFileIndex");
        filedata['size'] = filesize;

        //  Add file record in objectstorageindex.
        StorageMain.addNewFileIndex(staging_bucket, filedata, function(){

          console.log("_addfile: addNewFileIndex: ", filedata);
          res.json({FileID : filedata.id });
          res.end();

        });

      });
    });


  },

  /**
   * Method: addfile
   * @param req
   * @param res
   *
   * Description:
   */
  addfiles: function (req, res) {



    // StorageMain.createNewFile(bucketObj, function(writerStream, filedata){
    // StorageMain.createNewFile(staging_bucket, function(writerStream, filedata){

    console.log("addFiles: ", req.headers['content-type']);

    if(req.headers['content-type'] && req.headers['content-type'].indexOf('multipart') === 0) {
      StorageMain.addFile_Multipart(req,res);
    }
    else {
      StorageMain.addFile_RestCall(req, res);
    }


    // });

  },

  _addfile: function (bucket, metadata, filestream, callback) {

    console.log("_addfile: bucket: ", bucket);
    console.log("_addfile: metadata: ", metadata);

    let bucketObj = hashtable_buckets.get(bucket);


    var filesize = 0;

    StorageMain.createFile(bucket, metadata, function(writerStream, filedata){

      // filestream.pipe(writerStream);

      filestream.on('data', function(chunk) {

        console.log("^^^^^^^^^^^^^^^^^^^^^^^^^^");
        writerStream.write(chunk);
        filesize += chunk.length;

        console.log("#########Size so far is: ", filesize);
      }).on('end', function() {
        console.log("Ended................");
        console.log("%%%%%%%%%%% before addNewFileIndex");
        filedata['size'] = filesize;

        //  Add file record in objectstorageindex.
        StorageMain.addNewFileIndex(bucket, filedata, function(){

          console.log("_addfile: addNewFileIndex: ", filedata);
          callback(undefined, filedata);

        });

      });
    });



  },

  _deletefile: function(container, fileID, path, callback){
    console.log("_deletefile: path: ", path);

    var array = path.split(':');

    if(array.length === 2) {
      let osd = hashtable_OSDs.get(array[0]);

      console.log("_deletefile: hashtable_osds: ", hashtable_OSDs.keys().toString());
      console.log("_deletefile: array: ", array);
      console.log("_deletefile: osd: ", osd);
      let filepath = osd.path + "/" + array[1];

      console.log("_deletefile: actual file path is: ", filepath);

      if(osd['device-type'] === "localSDD") {
        localSSD.deleteFile(osd, array[1]);
        var bucket_index = "sm_objectstoreindex" + "_" + container;
        
        esclient.deleteItem(bucket_index, fileID, function(err, response){

        });

      }
      else if(osd['device-type'] === "localHDD") {
        localOSD.deleteFile(osd, array[1]);
        var bucket_index = "sm_objectstoreindex" + "_" + container;
        
        esclient.deleteItem(bucket_index, fileID, function(err, response){

        });

      }
      else {
        console.log("_deletefile: unsupported OSD device type: ", osd['device-type']);
      }

    }
    else {
      console.log("_deletefile: Invalid path: ", path);
    }

    return undefined;

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
      // var readstream = StorageMain.getFile(frombucketObj, objID);
      // var writerstream = StorageMain.createFile(tobucketObj, objID);
      // readstream.pipe(writerstream);
    //  TODO: INCOMPLETE IMPLEMENTATION

    });

  },

  getobjects: function(bucket, query, callback) {

    console.log("getobjects: bucket: ", bucket);
    console.log("getobjects: query: ", query);

    esclient.getItems('sm_objectstoreindex_' + bucket, {}, {'query': query}, function(err, result){

      // console.log("getObjects: result: ", JSON.stringify(result));
      callback(err, result);

    });

  },

  bulkupdate: function(arrUpdateItems, callback) {

    console.log("bulkupdate: ", arrUpdateItems);

    var arrESUpdateItems = [];

    arrUpdateItems.map(( updateItem) => {

      console.log("updateItem: ", updateItem);

      var indexname = StorageMain.getIndexForBucket(updateItem['container']);

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
      return StorageMain.getFile(item.sourcebucket, item.id, {}, function(err, filestream, metadata){

        console.log("bulkmove: err: ", err);
        console.log("bulkmove: metadata: ", metadata);

        metadata.container = item.targetbucket;
        metadata.status = "online"; // this document will not be online

        return StorageMain._addfile(item.targetbucket, metadata, filestream, function(err, resp){

        });

      });

    });

    Promise.all(promises).then((results) => {
      console.log("bulkmove: promises results: ". results);
      callback();

    });

    // copy the file from source bucket to target bucket

  },

  // All the items will be moved from same source to single target
  bulkmove1: function(arrUpdateItems, sourcecontainer, targetcontainer, callback) {
    
        console.log("bulkmove1: ", arrUpdateItems);
    
        let promises = arrUpdateItems.map((item) => {
    
          console.log("bulkmove1: ", item);
          return StorageMain.getFile(sourcecontainer, item.id, {}, function(err, filestream, metadata){
    
            console.log("bulkmove1: err: ", err);
            console.log("bulkmove1: metadata: ", metadata);
    
            metadata.container = targetcontainer;
            metadata.status = "online"; // this document will not be online
    
            return StorageMain._addfile(targetcontainer, metadata, filestream, function(err, resp){
              // now delete the file from staging. Delete the file from storage and its metada from index
              StorageMain._deletefile(sourcecontainer, item.id, item.path, function(err, response){

              });
    
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

module.exports = StorageMain;
