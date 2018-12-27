const faceIdDb = require('../database/db');
const faceId = require('../FaceID');
const db = faceIdDb.db;

function StartTest() {
    TestAddUser();
}

function TestAddUser() {
    faceIdDb.AddPerson({title: 'robert', fullName: 'robert holstein', photos: []})
    faceIdDb.AddPerson({title: 'courtney', fullName: 'courtney rude', photos: []})
    faceIdDb.AddPerson({title: 'shio', fullName: 'robert holstein', photos: []})
    var person = db.get('person').find(i => i.title === 'robert').value();
    faceId.CreateAlbum(person.title);
}

module.exports = {
    StartTest: StartTest
}