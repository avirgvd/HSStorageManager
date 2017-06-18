/**
 * Created by govind on 4/30/17.
 */

var fs = require('fs');
var mkdirp = require('mkdirp');

const LOCAL_STORAGE_PATH = '/home/govind/HomeServer/LOCALSTORAGE/';

var LocalStorage = {

  createFile: function(bucket, objID){

    var bucketpath = LOCAL_STORAGE_PATH + bucket;

    mkdirp( bucketpath, function (err) {
      if (err)
        console.error('createFile: ', err);
      else
        console.log('createFile: bucket path: ', bucketpath);
    });

    var writerStream = fs.createWriteStream(bucketpath + objID);

    writerStream.on('open', (chunk) => {
      console.log("From LocalStorage OSD on open...");
    });
    writerStream.on('close', () => {
      console.log("From LocalStorage OSD on close <", objID, ">...");

    });

    return writerStream;

  },

  readFile: function(bucket, objID) {
    return fs.createReadStream(LOCAL_STORAGE_PATH + bucket + objID);

  },

};

module.exports = LocalStorage;
