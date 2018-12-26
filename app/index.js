// Configure environment variables
var CONST = require('./Const');
const fs = require('fs');
const path = require('path');
const chokidar = require('chokidar');
var FaceID = require("./FaceID");

WatchImageFolder();

// Check for changes to images foler
function WatchImageFolder() {
    var timeOut;
    chokidar.watch(CONST.IMAGEFOLDER, {ignoreInitial: true, ignored: /(^|[\/\\])\../}).on('add', (event, path) => {
        if (!timeOut) {
            console.log(`New image added to image folder`);
            timeOut = setTimeout(function() { timeOut=null; ReadFiles(); }, 5000) // give 5 seconds for multiple events
        }
    });
}

// Read the files in images folder and gather info
function ReadFiles() {
    fs.readdir(CONST.IMAGEFOLDER, (err, files) => {
        if(files.length > 0) {
            files.forEach(fileName => {
                var filePath = path.join(CONST.IMAGEFOLDER, `/${fileName}`)
                var readFile = fs.readFileSync(filePath);
                var fileObject = { readFile: readFile, filePath: filePath, fileName: fileName }
                FaceID.ProcessImage(fileObject);
            });
        }
    })
}