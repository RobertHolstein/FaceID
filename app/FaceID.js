const CONST = require('./Const');
const AWS = require('aws-sdk');
const fs = require('fs');
const path = require('path');
const gm = require('gm');

AWS.config.loadFromPath(CONST.AWSCONFIG);
var s3 = new AWS.S3({
    apiVersion: '2006-03-01',
    params: {Bucket: CONST.S3BUCKET}
});
var rekognition = new AWS.Rekognition();

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
                (face.BoundingBox.Width * size.width) * 1.3,
                (face.BoundingBox.Height * size.height) * 1.3,
                (face.BoundingBox.Left * size.width) * .9,
                (face.BoundingBox.Top * size.height) * .9
            )
            .write(`${CONST.CROPPEDIMAGEFOLDER}/${croppedFileName}`, function (err) {
                if (!err) { 
                    facesCropped += 1
                    console.log(`Face cropped and saved to: ${CONST.CROPPEDIMAGEFOLDER}`);
                    if(facesCropped === FaceDetails.length)
                    {
                        DeleteFile(fileObject);
                    }
                    var filePath = path.join(CONST.CROPPEDIMAGEFOLDER, `/${croppedFileName}`)
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
        //Bytes: new Buffer(fileObject.readFile)
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
            //DeleteFile(fileObject);
            console.log(data);  
        }
    });
}

//*************************************************

//*************************************************
// Compare faceid results from searching faces by image to database
//*************************************************

function AddPhoto(albumName, fileObject) {
    var albumPhotosKey = encodeURIComponent(albumName) + '//';
  
    var photoKey = albumPhotosKey + fileObject.fileName;
    s3.upload({
      Key: photoKey,
      Body: fileObject
      //ACL: 'public-read'
    }, function(err, data) {
      if (err) {
        alert('There was an error uploading your photo: ', err.message);
        return
      }
      alert('Successfully uploaded photo.');
      viewAlbum(albumName);
    });
}

// Delte photo
function DeletePhoto(albumName, photoKey) {
    s3.deleteObject({Key: photoKey}, function(err, data) {
    if (err) {
        return alert('There was an error deleting your photo: ', err.message);
        }
        alert('Successfully deleted photo.');
        viewAlbum(albumName);
    });
}



function CreateAlbum(albumName) {
    albumName = albumName.trim();
    if (!albumName) {
        console.error('Album names must contain at least one non-space character.');
        return;
    }
    if (albumName.indexOf('/') !== -1) {
        console.error('Album names cannot contain slashes.');
        return;
    }
    var albumKey = encodeURIComponent(albumName) + '/';
    s3.headObject({Key: albumKey}, function(err, data) {
      if (!err) {
        console.error(`${albumKey} already exists`);
        return;
      }
      if (err.code !== 'NotFound') {
        console.error('There was an error creating your album: ' + err.message);
        return;
      }
      s3.putObject({Key: albumKey}, function(err, data) {
        if (err) {
          console.error('There was an error creating your album: ' + err.message);
        } else {
            console.log('Successfully created album.');
            viewAlbum(albumName);
        }
      });
    });
}

function ViewAlbum(albumName) {
    var albumPhotosKey = encodeURIComponent(albumName) + '/';
    s3.listObjects({Prefix: albumPhotosKey}, function(err, data) {
        if (err) {
            console.error('There was an error viewing your album: ' + err.message);
            return;
        }
        // `this` references the AWS.Response instance that represents the response
        var href = this.request.httpRequest.endpoint.href;
        var bucketUrl = href + CONST.S3BUCKET + '/';
  
        var photos = data.Contents.map(function(photo) {
            var photoKey = photo.Key;
            var photoUrl = bucketUrl + encodeURIComponent(photoKey);
            console.log(photoUrl);
        });
    });
}

module.exports = {
    ProcessImage: ProcessImage,
    CropFacesFromPhotos: CropFacesFromPhotos,
    DeleteFile: DeleteFile,
    IndexFace: IndexFace,
    CompareFace: CompareFace,
    AddPhoto: AddPhoto,
    DeletePhoto, DeletePhoto,
    CreateAlbum: CreateAlbum,
    ViewAlbum: ViewAlbum
}