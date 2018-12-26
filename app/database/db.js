const CONST = require('../Const');
const low = require('lowdb');
const FileSync = require('lowdb/adapters/FileSync');
const adapter = new FileSync(CONST.JSONDB);
const db = low(adapter);

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