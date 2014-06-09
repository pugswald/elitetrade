var mongoose = require('mongoose'),
    Schema = mongoose.Schema,
    ObjectId = Schema.ObjectId;
  
/**
* Schema
*/
// TODO: expiration on read functionality
var MessageSchema = Schema({
    recipient: ObjectId,
    sender: ObjectId,
    expires: Date,
    message: String
});

mongoose.model('MessageModel', MessageSchema);
