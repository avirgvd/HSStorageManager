/**
 * Created by govind on 4/30/17.
 */

var fs = require('fs');
var mkdirp = require('mkdirp');

var LocalSSD = {

  createFile: function(osd, bucket, filedata, callback){

    var bucketpath = osd['path'] + bucket['basepath'] + "/";

    console.log("LocalSSD:createFile: bucketpath: ", bucketpath);
    console.log("LocalSSD:createFile: filedata1212121: ", filedata);

    // // TODO: this below action can be avoided if the bucket path in OSD is created at startup
    // mkdirp( bucketpath, function (err) {
    //   console.log("!@!@!@!@!@!@!@@@@@@@@@@@@@@@@@@");
    //   if (err)
    //     console.error('createFile: ', err);
    //   else {

        console.log('LocalSSD:createFile: bucket path: ', bucketpath);

        filedata.path =  osd['id'] + ":" + bucket['basepath'] + "/" + filedata.id;
        var writerStream = fs.createWriteStream(bucketpath + filedata.id);

        writerStream.on('open', (chunk) => {
          console.log("LocalSSD: From LocalStorage OSD on open...", filedata.id);
          callback(writerStream, filedata);
        });
        writerStream.on('close', () => {
          console.log("LocalSSD: From LocalStorage OSD on close <", filedata.id, ">...");

        });


      // }



    // });



  },

  readFile: function(osd, relativepath) {
    return fs.createReadStream(osd.path + "/" + relativepath);

  },

};

module.exports = LocalSSD;
