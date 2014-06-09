var mongoose = require('mongoose');
var UserModel = mongoose.model('UserModel');
//var MessageModel = mongoose.model('MessageModel');
var MAX_KEY_LENGTH = 10000;  // To avoid spammy hackers
var https = require('https');
//var pgp = require('node-pgp');
var spawn = require('child_process').spawn;
var exec = require('child_process').exec;
var fs = require('fs');
var uuid = require('node-uuid');
var FACEBOOK_REFRESH_TIME = 5*60*1000; // 5 minutes between facebook refreshes for a same user
var ObjectId = require('mongoose').Types.ObjectId; 

function getUserJson(user) {
  // Get stripped down user json object (not string) for a specific uid 
  //console.log('Get user JSON start');
  var friends = [];
  user.friends.forEach( function(friend_m){
//    for (var fi=0; fi<user.friends.length;++fi){
//      var friend_f = user.friends[fi];
    var friend = {name:friend_m.facebook.name,fb_id:friend_m.facebook_id,id:friend_m._id};
    if (friend_m.public_key){
      friend.public_key=friend_m.public_key;
    }
    friends.push(friend);
  });
  
  var stripped_user = { 
    id: user._id,
    private_key: user.private_key,
    public_key: user.public_key,
    name: user.facebook.name,
    friends: friends,
    facebook_friend_count:user.facebook_friend_count
  };
  return stripped_user;
}

/*
 * GET user information, private key and friend public keys
 */

exports.user_get = function(req, res){
  if (! req.loggedIn) {
    res.json({error:'Not logged in'});
    return false;
  }    
  //console.log('user get');
  //console.log(req.session.auth);
  UserModel.findOne( {_id:req.session.auth.userId}).populate('friends').exec(function (err,user) {
    if (err) {
      res.json({error:err});
      return false;
    }
    var refreshTime = 0;
    var now = new Date();
    if (user.last_friend_check){
      refreshTime = user.last_friend_check.getTime() + FACEBOOK_REFRESH_TIME;
    }
    if (refreshTime < now.getTime()){
      // Update friends
      //console.log('Time to refresh friends list');
      https.get('https://graph.facebook.com/me/friends?access_token='+req.session.auth.facebook.accessToken,
        function(fb_res){
          //console.log('Success in getting friends list');
          //console.log("statusCode: ", res.statusCode);
          var friends_json = '';
          //console.log("headers: ", res.headers);
          fb_res.on('data', function(d){
            friends_json += d;
          });
          fb_res.on('end', function(){
            //console.log(friends_json);
            var friends_list = JSON.parse(friends_json);
            if (friends_list.data){
              /*
              UserModel.findOne( {_id:req.session.auth.userId}, function (err,user) {
                if (err) {
                  console.log("Error in user-> friend updates");
                  console.log(err);
                } else {*/
              user.facebook_friend_count=friends_list.data.length;
              user.last_friend_check=now;
              user.save();
              //user.update( {facebook_friend_count:friends_list.data.length, last_friend_check:now}).exec();
              // Friends can each get updated, make sure the user does a single update for 
              var fbid_arr=[];
              friends_list.data.forEach(function(f){
                fbid_arr.push(f.id);
                UserModel.findOne( {facebook_id:f.id}, function (err,friend) {
                  if (err){
                    console.log("Error in user-> friend updates find friend");
                    console.log(err);
                  } else if (friend) {
                    //user.update( {$addToSet: {friends:friend}}).exec();
                    friend.update( {$addToSet: {friends:user}}).exec();  // TODO: Do I care if this fails?
                  }
                });
              });
              UserModel.find({facebook_id: { $in: fbid_arr}}, function(err, friends_found) {
                if (err){
                  console.log("Error in user->  find friends");
                  console.log(err);
                }
                UserModel.findByIdAndUpdate(req.session.auth.userId
                  ,{$addToSet :{friends: {$each:friends_found}}}).populate('friends').exec(
                  function(err, newuser){
                    if (err){
                      res.json({error:err});
                      console.log("Error in user->  find friends");
                      console.log(err);
                    }
                    res.json({success:true,data:getUserJson(newuser)});
                });
              });
                //user.update({$addToSet :{friends: {$each:friends_found}}}, function(err, )
               //user.update( //{ facebook_id: { $in: fbid_arr}},

                //{ $addToSet: {friends:{ $each : facebook_id: { $in: fbid_arr}}}}, );
              //for (var fi in friends_list.data){
              //  var f = friends_list.data[fi];
              //  console.log(f);
              //}
              /*
              });
              }
              console.log('What is up with the user');
              console.log(user);
              res.json({success:true,data:getUserJson(user)});*/
              /*
                  //getUserJson(req.session.auth.userId,res.json);
                }
              });*/
            } else {
              console.log('Problem with facebook return data');
              //getUserJson(req.session.auth.userId,res.json);
            }
          });
        }
      ).on('error', function(e){
        console.log('Error retrieving friends for'+req.session.auth.userId);
        console.log(e);
      });
    } else {
        res.json({success:true,data:getUserJson(user)});
    }
  });

/*
  UserModel.findOne( {_id:req.session.auth.userId}).populate('friends').exec(function (err,user) {
    if (err) {
      res.json({error:err});
      return false;
    }
      
    console.log('user get');
    console.log(user);
    var friends = [];
    console.log(user.friends);
    for (var fi=0; fi<user.friends.length;++fi){
      console.log(fi);
      
      var friend_f = user.friends[fi];
      var friend = {name:friend_f.facebook.name,fb_id:friend_f.facebook_id};
      if (friend_f.public_key){
        friend.public_key=friend_f.public_key;
      }
      friends.push(friend);
    }
    
    var stripped_user = { 
      id: user._id,
      private_key: user.private_key,
      public_key: user.public_key,
      name: user.facebook.name,
      friends: friends,
      facebook_friends_count:user.facebook_friends_count
    };
    res.json({success:true,data:stripped_user});

  });
    */

};

/*
 * POST user updates.  Must have:
 *  private_key
 *  public_key
 * TODO: Extract public_key from private_key before storing
 */
exports.user_post = function(req,res){
  if (! req.loggedIn) {
    res.json({error:'Not logged in'});
    return;
  }
  // Data validation
  if ((!req.body.private_key)||(!req.body.public_key)){
    res.json({error:'Private key missing'});
    return;
  }
  if ((req.body.private_key.length > MAX_KEY_LENGTH) || (req.body.private_key.length > MAX_KEY_LENGTH)){
    res.json({error:'Key data far too big'});
    return;
  }
  var private_key=req.body.private_key;
  var public_key=req.body.public_key;
  var pubring = '/tmp/'+uuid.v4();
  var priring = '/tmp/'+uuid.v4();
  var uid_regex = /\"([0-9a-f]+)\"/;
  // Validate keys
  var gpg = exec('gpg --no-options --no-default-keyring --secret-keyring '+priring+' --import',
    function(err,stdout,stderr){
      if (err) {
        res.json({error:err});
      } else {
        // Format of stderr:
        /* gpg: key 4B20A75D: secret key imported
         * gpg: key 4B20A75D: "51d9d8581339c5c716000001" not changed
         * gpg: Total number processed: 1
         * gpg:              unchanged: 1
         * gpg:       secret keys read: 1
         * gpg:   secret keys imported: 1
         */
        var pri_key_uid_match = stderr.match(uid_regex);
        //console.log('prikeyring: '+priring);
        //console.log('stdout:'+stdout);
        //console.log('stderr:'+stderr);
        //console.log('Private key uid');
        if (pri_key_uid_match){
          var pri_key_uid = pri_key_uid_match[1];
          // Test public key for matching uid
          var gpg_pub = exec('gpg --no-options --no-default-keyring --keyring '+pubring+' --import',
            function(err,stdout,stderr){
              if (err) {
                res.json({error:err});
              } else {
                // Format of stderr:
                /* gpg: keyring `/tmp/7581990b-28c9-4348-b986-8e4ba8257773' created
                 * gpg: key 4B20A75D: public key "51d9d8581339c5c716000001" imported
                 * gpg: Total number processed: 1
                 * gpg:               imported: 1  (RSA: 1)
                 */
                //console.log('pubkeyring: '+pubring);
                //console.log('stdout:'+stdout);
                //console.log('stderr:'+stderr);
                var pub_key_uid_match = stderr.match(uid_regex);
                if (pub_key_uid_match){
                  var pub_key_uid = pub_key_uid_match[1];
                  // Make sure all uids are the same before continuing
                  if ((pub_key_uid == pri_key_uid) && (pub_key_uid == req.session.auth.userId)) {
                    // Go ahead and save the keys
                    console.log('Saving new private and public keys');
                    UserModel.findByIdAndUpdate(req.session.auth.userId
                      ,{public_key : public_key, private_key:private_key}).populate('friends').exec(
                        function(err, user){
                          if (err){
                            res.json({error:err});
                            console.log("Error in user->  save keys");
                            console.log(err);
                          }
                          res.json({success:true,data:getUserJson(user)});
                        }
                    );
                  } else {
                    console.log('Invalid key data found:');
                    console.log('  user: '+req.session.auth.userId);
                    console.log('   pub: '+pub_key_uid);
                    console.log('   pri: '+pri_key_uid);
                    res.json({error:'Key data does not match user data'});
                  }
                } else {
                  res.json({error:err});
                }
              }
            }
          );
          gpg_pub.stdin.write(public_key);
          gpg_pub.stdin.end();
        } else {
          res.json({error:err});
        }
      }
    }
  );
  gpg.stdin.write(private_key);
  gpg.stdin.end();
};

exports.user_delete = function(req, res){
  if (! req.loggedIn) {
    res.json({error:'Not logged in'});
    return false;
  }
  console.log('Attempting to remove '+req.session.auth.userId);
  TradeModel.find({ user: req.session.auth.userId }).remove();
  UserModel.findById(req.session.auth.userId).remove();
  res.json({success:true}); 
};

exports.user_invite = function(req, res){
  // Send a message to all the user's facebook friends, inviting them
  // to have a private conversion on fourth social
  if (! req.loggedIn) {
    res.json({error:'Not logged in'});
    return false;
  }
  res.json({error:'Not implemented'});
}
