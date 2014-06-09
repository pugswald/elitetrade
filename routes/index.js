
/*
 * GET home page.
 */
var mongoose = require('mongoose');
var UserModel = mongoose.model('UserModel');

exports.index = function(req, res){
//	console.log(req.loggedIn);
//	console.log(req.session);
//	console.log(res.locals);
  if (req.loggedIn) {
    //console.log(req.session.auth);
    // res.render('index',{userId:req.session.auth.userId});
    userId = req.session.auth.userId;
    var user = UserModel.findOne({_id:req.session.auth.userId}).exec(function (err, user){
      var is_admin = false;
      if (user){
        is_admin = user.is_admin;
      }
      res.render('index',{userId:userId, is_admin:is_admin});
    });
  } else {
    res.render('index',{userId:0, is_admin:false});
  }
};
