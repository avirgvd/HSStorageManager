/**
 * Created by govind on 7/5/17.
 */



var fs = require('fs');
var sharp = require('sharp');
var Map = require('hashtable');
var pdfjslib = require('pdfjs-dist');

var storagemanager = require('../HStorageManager');

var hashtable_thumbnails = new Map();


var HSThumbnails = {

  getThumbnail: function(mimetype, filestream, filename){

    // if(mimetype == "image/jpeg") {
    if(mimetype.indexOf("image/") == 0) {
      const thumbnailgenerator = sharp()
        .resize(200);

      return filestream.pipe(thumbnailgenerator);
    }
    else if (mimetype == "application/pdf") {


      // Temporary code before I could figure out creating thumbnail from filestream for PDF
      var filestream1 = fs.createReadStream("/home/govind/HomeServer/LOCALSDD/system/DigitalLibrary.png");
      return filestream1;

      // return HSThumbnails.generatePDFThumbnail(filestream);
    }
  },

  generatePDFThumbnail: function(filestream){

    // Read the PDF file into a typed array so PDF.js can load it.
    var rawData = new Uint8Array(fs.readFileSync(filestream));

    // Load the PDF file.
    pdfjslib.getDocument(filestream).then(function (pdfDocument) {
      console.log('# PDF document loaded.');

      // Get the first page.
      pdfDocument.getPage(1).then(function (page) {
        // Render the page on a Node canvas with 100% scale.
        var viewport = page.getViewport(1.0);
        var canvasFactory = new NodeCanvasFactory();
        var canvasAndContext = canvasFactory.create(viewport.width, viewport.height);
        var renderContext = {
          canvasContext: canvasAndContext.context,
          viewport: viewport,
          canvasFactory: canvasFactory
        };

        page.render(renderContext).then(function () {
          // Convert the canvas to an image buffer.
          var image = canvasAndContext.canvas.toBuffer();
          fs.writeFile('output.png', image, function (error) {
            if (error) {
              console.error('Error: ' + error);
            } else {
              console.log('Finished converting first page of PDF file to a PNG image.');
            }
          });
        });
      });
    }).catch(function(reason) {
      console.log(reason);
    });


  },


  lookup: function(objID) {

    return hashtable_thumbnails.get(objID);
  },

  addthumbnail: function(objID, path) {

    hashtable_thumbnails.put(objID, path);
  },

};

module.exports = HSThumbnails;
