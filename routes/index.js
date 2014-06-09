
/*
 * GET home page.
 */
var mongoose = require('mongoose');
var UserModel = mongoose.model('UserModel');

exports.index = function(req, res){
//	console.log(req.loggedIn);
//	console.log(req.session);
//	console.log(res.locals);
  var userId = 0;
    if (req.loggedIn) {
      //console.log(req.session.auth);
      // res.render('index',{userId:req.session.auth.userId});
      userId = req.session.auth.userId;
    } /*else {
        res.render('index',{userId:0});
//        res.render('login');
    }*/
  res.render('index',{userId:userId})
  //res.render('index',{userId:req.session.auth.userId});

};
