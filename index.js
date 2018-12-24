//*************************************************
// Configure environment variables
const AWS = require('aws-sdk');
const fs = require('fs');
const path = require('path');
const gm = require('gm');
const chokidar = require('chokidar');
const low = require('lowdb')
const FileSync = require('lowdb/adapters/FileSync')
const adapter = new FileSync('./db.json')
const db = low(adapter)

const imageFolder = path.join(__dirname, './images')
const croppedImageFolder = path.join(__dirname, './cropped-images')
AWS.config.loadFromPath('./aws-config.json');
var rekognition = new AWS.Rekognition();
//*************************************************

var timeOut;

// Check for changes to images foler
chokidar.watch(imageFolder, {ignoreInitial: true, ignored: /(^|[\/\\])\../}).on('add', (event, path) => {
    if (!timeOut) {
        console.log(`New image added to image folder`);
        timeOut = setTimeout(function() { timeOut=null; ReadFiles(); }, 5000) // give 5 seconds for multiple events
    }
});

// Read the files in images folder and gather info
function ReadFiles() {
    fs.readdir(imageFolder, (err, files) => {
        if(files.length > 0) {
            files.forEach(fileName => {
                var filePath = path.join(imageFolder, `/${fileName}`)
                var readFile = fs.readFileSync(filePath);
                var fileObject = { readFile: readFile, filePath: filePath, fileName: fileName }
                ProcessImage(fileObject);
            });
        }
    })
}

// Process the image with aws
function ProcessImage(fileObject) {
    var params = {
        Image: {
        Bytes: new Buffer(fileObject.readFile)
        },
        Attributes: [
        'DEFAULT',
        ]
    };
    rekognition.detectFaces(params, function (err, data) {
      if (err) console.log(err, err.stack); // an error occurred
        else {
            var goodFaces = data.FaceDetails.filter(i => i.Confidence > 94)
            if (goodFaces.length > 0) {
                CropFacesFromPhotos(data.FaceDetails, fileObject)        
            } else { 
                console.error(`No faces found in ${fileObject.fileName}`) 
                DeleteFile(fileObject);
            }
        }
    });
}

// Crop faces from photos and save them
function CropFacesFromPhotos(FaceDetails = [], fileObject) {
    var facesCropped = 0;
    console.log(`cropping ${FaceDetails.length} faces from image ${fileObject.fileName}`)
    FaceDetails.forEach(face => {
        gm(fileObject.filePath).size(function (err, size) {
            var croppedFileName = `${Math.round(Math.random()*10000)}${fileObject.fileName}`
            this.crop(
                face.BoundingBox.Width * size.width,
                face.BoundingBox.Height * size.height,
                face.BoundingBox.Left * size.width,
                face.BoundingBox.Top * size.height
            )
            .write(`${croppedImageFolder}/${croppedFileName}`, function (err) {
                if (!err) { 
                    facesCropped += 1
                    console.log(`Face cropped and saved to: ${croppedImageFolder}`);
                    if(facesCropped === FaceDetails.length)
                    {
                        DeleteFile(fileObject);
                    }
                    var filePath = path.join(croppedImageFolder, `/${croppedFileName}`)
                    CompareFace({ readFile: fs.readFileSync(filePath), filePath: filePath, fileName: croppedFileName });
                }
                else  console.log(err);
            });
        })
    });
}

// Deletes file
function DeleteFile(fileObject) {
    fs.unlink(fileObject.filePath, function (err) {
        if (err) throw err;
        // if no error, file has been deleted successfully
        console.log(`File ${fileObject.fileName} deleted!`);
    }); 
}

//*************************************************
// Add faces to collection
// EXAMPLE:
// var params = {
//     CollectionId: "myphotos", 
//     DetectionAttributes: [
//     ], 
//     ExternalImageId: "myphotoid", 
//     Image: {
//     Bytes: new Buffer('...')
//      S3Object: {
//       Bucket: "mybucket", 
//       Name: "myphoto"
//      }
//     }
// };
   
// rekognition.indexFaces(params, function(err, data) {
//      if (err) console.log(err, err.stack); // an error occurred
//      else     console.log(data);   
// });

function IndexFace(fileObject) {
var params = {
    CollectionId: "FaceID-collection", 
    ExternalImageId: fileObject.fileName, 
    Image: {
        Bytes: new Buffer(fileObject.readFile)
    }
};
   
rekognition.indexFaces(params, function(err, data) {
     if (err) console.log(err, err.stack); // an error occurred
     else {
        console.log(data);
    }
    });
}

//*************************************************

//*************************************************
// Create a database that puts faceids to names
db.defaults({ person: [{ id: 0, title: "", fullName: "", faceIds: [] }], count: 0 })
  .write()

addPerson({title: 'robert', fullName: 'robert holstein', faceIds: []})

function addPerson(person) {
  var userCount =  db.get('count').value();
  db.get('person')
  .push({ id: userCount, title: person.title, fullName: person.fullName, faceIds: person.faceIds})
  .write();

  updateUserCount();
}

addFaceId(0, "test1")
addFaceId(0, "test2")

function updateUserCount() {
    db.update('count', n => n + 1)
    .write();
}

function addFaceId(personId, FaceId) {
    var faceIds = db
    .get('person')
    .find({ id: personId })
    .get('faceIds')
    .value();

    faceIds.push(FaceId);

    db.get('person')
    .find({ id: personId })
    .assign({ faceIds })
    .write();
}
//*************************************************

//*************************************************
// Take photos with camera when faces are detected
// If motion is detected take photo
// ?? check if photo has face in it OR just send 
// ?? image to SearchFacesByImage...
//*************************************************

//*************************************************
// Search collection for faceid that match photo
// EXAMPLE:
// var params = {
//     CollectionId: "myphotos", 
//     FaceMatchThreshold: 95,
//     Bytes: new Buffer('...')
//     Image: {
//      S3Object: {
//       Bucket: "mybucket", 
//       Name: "myphoto"
//      }
//     }, 
//     MaxFaces: 5
//    };
//    rekognition.searchFacesByImage(params, function(err, data) {
//      if (err) console.log(err, err.stack); // an error occurred
//      else     console.log(data);           // successful response
//    });

function CompareFace(fileObject) {
    var params = {
        CollectionId: "FaceID-collection", 
        FaceMatchThreshold: 89,
        Image: {
            Bytes: new Buffer(fileObject.readFile)
        },
        MaxFaces: 5
    };
    rekognition.searchFacesByImage(params, function(err, data) {
        if (err) console.log(err, err.stack); // an error occurred
        else {
            DeleteFile(fileObject);
            console.log(data);  
        }
    });
}

//*************************************************

//*************************************************
// Compare faceid results from searching faces by image to database
//*************************************************

