/**
 * Created by govind on 4/30/17.
 */

var fs = require('fs');
var mkdirp = require('mkdirp');

var LocalStorage = {

  createFile: function(osd, bucket, filedata, callback){

    var bucketpath = osd['path'] + bucket['basepath'] + "/";

    console.log("localStorage:createFile: bucketpath: ", bucketpath);
    console.log("localStorage:createFile: filedata: ", filedata);

    // TODO: this below action can be avoided if the bucket path in OSD is created at startup
    // mkdirp( bucketpath, function (err) {
    //   if (err)
    //     console.error('createFile: ', err);
    //   else
    //     console.log('createFile: bucket path: ', bucketpath);
    // });

    console.log("localStorage:createFile: 123: ");


    filedata.path =  osd['id'] + ":" + bucket['basepath'] + "/" + filedata.id;
    console.log("localStorage:createFile: filedata.path: ", filedata.path);

    var writerStream = fs.createWriteStream(bucketpath + filedata.id);

    writerStream.on('open', (chunk) => {
      console.log("From LocalStorage OSD on open...");
    });
    writerStream.on('close', () => {
      console.log("From LocalStorage OSD on close <", filedata.id, ">...");

    });

    callback(writerStream, filedata);

  },

  readFile: function(osd, relativepath) {
    return fs.createReadStream(osd.path + "/" + relativepath);

  },

};

module.exports = LocalStorage;
