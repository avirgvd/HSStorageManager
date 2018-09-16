/**
 * Created by govind on 5/1/17.
 */


var _ = require('lodash');
const uuidv4 = require('uuid/v4'); // Ramdon UUID generator
var time = require('time')(Date);
var fs = require('fs');

var esIndicesConfig = require('./elasticsearch/esIndicesConfig');
var esclient = require('./elasticsearch/esclient');
var storagemain = require('./storage/storagemain');

var hsthumbnails = require('./thumbnail/HSThumbnails');

// Use Busboy to parse form-data from the uploaded file content.
var Busboy = require('busboy');

var Map = require('hashtable');

var hashtable_buckets = new Map();
var hashtable_OSDs = new Map();
var staging_bucket = "staging";

var HStorageManager = {

  init: function(){

    storagemain.init();

  },

  getObjectMeta: function(bucket, fileID, callback) {

    storagemain.getObjectMeta(bucket, fileID, callback);

  },


  getFile: function(bucket, objID, query, callback) {

    storagemain.getFile(bucket, objID, query, callback);

  },


  // The multipart mime type is used when the files are submitted from forms.
  // This function handles file upload requests from web browser clients
  addFile_Multipart: function (req, res) {
    console.log("addFile_Miltipart: ");

    // First add the file to staging area for extracting file meta data before moving it to persistent storage
    // Create a writable stream
    //   var writerStream = fs.createWriteStream(objID);
    let bucketObj = hashtable_buckets.get(staging_bucket);


    var busboy = new Busboy({headers: req.headers});
    var returnfiledata = {};

    busboy.on('file', function(fieldname, file, filename, encoding, mimetype) {
      console.log('File [' + fieldname + ']: filename: ' + filename + ', encoding: ' + encoding + ', mimetype: ' + mimetype);

      // HStorageManager.createNewFile(bucketObj, function(writerStream, filedata){
      storagemain.createNewFile(staging_bucket, {}, function(writerStream, filedata){
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
          returnfiledata = filedata;
          // var promise = writerStream.close();
          // Add file record in objectstorageindex.
          storagemain.addNewFileIndex(staging_bucket, filedata, function(){

            console.log("addFile_Multipart: addNewFileIndex: ");

          });
        });
      });

    });

    busboy.on('field', function(fieldname, val, fieldnameTruncated, valTruncated, encoding, mimetype) {
      console.log('on Field [' + fieldname + ']: value: ' + val);
      // filedata.params = {tag: val};
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

    var filesize = 0;

    storagemain.createNewFile(staging_bucket, JSON.parse(req.headers['metadata']), function(writerStream, filedata){

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
        storagemain.addNewFileIndex(staging_bucket, filedata, function(){

          console.log("addFile_RestCall: addNewFileIndex: ", filedata);
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
   * @param stage - true if staging is desired, false if no staging is required. Default is true
   *
   * Description:
   */
  addfiles: function (req, res, stage) {

    console.log("addFiles: ", req.headers['content-type']);
    console.log("addFiles: staging required ", stage);

    if(req.headers['content-type'] && req.headers['content-type'].indexOf('multipart') === 0) {
      storagemain.addFile_Multipart(req,res);
    }
    else {
      storagemain.addFile_RestCall(req, res);
    }

  },


  _mergeMetaData: function (medatada1, metadata2) {

  },

  moveobject: function(objID, frombucket, tobucket, callback) {

    storagemain.moveobject(objID, frombucket, tobucket, callback);

  },

  getobjects: function(bucket, query, callback) {

    storagemain.getobjects(bucket, query, callback);

  },

  bulkupdate: function(arrUpdateItems, callback) {

    storagemain.bulkupdate(arrESUpdateItems, callback);

  },

  bulkmove: function(arrUpdateItems, callback) {

    storagemain.bulkmove(arrUpdateItems, callback);

  },

  // All the items will be moved from same source to single target
  bulkmove1: function(arrUpdateItems, sourcecontainer, targetcontainer, callback) {

    storagemain.bulkmove1(arrUpdateItems, sourcecontainer, targetcontainer, callback);
    
  },
    



};

module.exports = HStorageManager;
