var mongoose = require('mongoose'),
    Schema = mongoose.Schema,
    ObjectId = Schema.ObjectId;

/**
* Schema
*/
var UserSchema = Schema({
    last_updated: Date,
    facebook_id: String,
    facebook: {},
    last_friend_check: Date,  // Future friend updates
    friends: [ { type: ObjectId, ref: 'UserModel'} ],
    facebook_friend_count: Number, // Used for showing how many friends are using this app
    is_admin: {type: Boolean, default: false},
    is_banned: {type: Boolean, default: false} // So they have to use a new FB ID to get back in and muck things up
});

mongoose.model('UserModel', UserSchema);
