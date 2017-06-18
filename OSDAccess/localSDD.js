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

  readFile: function(osd, relativepath) {
    return fs.createReadStream(osd.path + "/" + relativepath);

  },

};

module.exports = LocalStorage;
