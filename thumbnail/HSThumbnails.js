/**
 * Created by govind on 7/5/17.
 */



var fs = require('fs');
var sharp = require('sharp');
var Map = require('hashtable');

var storagemanager = require('../HStorageManager');

var hashtable_thumbnails = new Map();


var HSThumbnails = {

  getThumbnail: function(mimetype, filestream){

    if(mimetype == "image/jpeg") {
      const thumbnailgenerator = sharp()
        .resize(200);

      return filestream.pipe(thumbnailgenerator);
    }
    else if (mimetype == "application/pdf") {

      // Temporary code before I could figure out creating thumbnail from filestream for PDF
      var filestream1 = fs.createReadStream("/home/govind/HomeServer/LOCALSDD/thumbnails/thumbnail_default.jpeg");
      return filestream1;

    }


  },

  lookup: function(objID) {

    return hashtable_thumbnails.get(objID);
  },

  addthumbnail: function(objID, path) {

    hashtable_thumbnails.put(objID, path);
  },

};

module.exports = HSThumbnails;
