//*************************************************
// Configure environment variables
const AWS = require('aws-sdk')
AWS.config.loadFromPath('./aws-config.json')
var rekognition = new AWS.Rekognition();
//*************************************************



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
//*************************************************

//*************************************************
// Compare faceid results from searching faces by image to database
//*************************************************

