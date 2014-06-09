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
    facebook_friend_count: Number // Used for showing how many friends are using this app
/*        id: ObjectId,
        facebook_id: String,
        name: String,
        public_key: String,
      } ]*/
});

mongoose.model('UserModel', UserSchema);
