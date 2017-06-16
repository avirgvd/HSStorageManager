/**
 * Created by govind on 4/30/17.
 */

var fs = require('fs');

const LOCAL_STORAGE_PATH = '/home/govind/HomeServer/LOCALSTORAGE/';

var LocalStorage = {

  createFile: function(bucket, objID){


    var writerStream = fs.createWriteStream(LOCAL_STORAGE_PATH+objID);

    writerStream.on('open', (chunk) => {
      console.log("From LocalStorage OSD on open...");
    });
    writerStream.on('close', () => {
      console.log("From LocalStorage OSD on close <", objID, ">...");

    });

    return writerStream;

  },

  readFile: function(objID) {
    // Do elasticsearch lookup on objID

  },

};

module.exports = LocalStorage;
