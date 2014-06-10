/*
 * GET messages for logged in user
 * POST new message
 */
var mongoose = require('mongoose');
var TradeModel = mongoose.model('TradeModel');
var CommodityModel = mongoose.model('CommodityModel');
var StationModel = mongoose.model('StationModel');
var UserModel = mongoose.model('UserModel');
//var MAX_MESSAGE_LENGTH = 10000000;
//var MAX_EXPIRATION_DAYS = 30; //days
//var MS_IN_DAY = 1000*60*60*24; // milliseconds in a day

var getPosInt = function(inp){
  // Attempt to parse inp as positive integer, returning value as int on success, 0 on failure
  try {
    var inpint = parseInt(inp);
    if (isNaN(inpint)) throw "Not a number";
    if (inpint < 1) return 0;
    return inpint;
  } catch (err) {
    return 0;
  }
};

var requireAdmin = function( req, res, callback ) {
    // Verify the requestor is an admin and do the callback
    if (! req.loggedIn) { // TODO: Can this be a decorator?
        res.json({error:'Not logged in'});
        return;
    }
    // Verify admin
    UserModel.findById(req.session.auth.userId, function( err, user ) {
        if (user.is_admin) {
            callback( req, res );
        }  else {
            res.json({error:'Not an admin'});
        }
    });
};

exports.get = function(req, res){
    // TODO: Available search parameters:
    //   name
    //   page
    //   rpp
    // By default, will return the first 10 stations alphabetically
    console.log(req.params);
    StationModel.find()
        .limit(10)
        .sort('-name')
//        .select('name system location.x location.y location.z')
         .select('name system location')
        .exec(function (err,stations) {
            if (!err) {
                StationModel.count({},function (err, count){
                    var response = {draw:parseInt(req.params.draw), recordsTotal:count, recordsFiltered:count}
                    var data = []
                    for (var i=0; i<stations.length; ++i){
                        var s = stations[i];
                        data.push([s.name,s.system,s.location.x,s.location.y,s.location.z,null]);                        
                    }
                    response.data = data;
                    res.json(response);
                });
                
            } else {
                res.json({error:err});
            }
        });
};


exports.delete = function(req, res){
    requireAdmin(req, res, function(req, res){
    /*
    if (! req.loggedIn) { // TODO: Can this be a decorator?
        res.json({error:'Not logged in'});
        return;
    }
    // Verify admin
    UserModel.findById(req.session.auth.userId, function( err, user ) {
        if (user.is_admin) {
            StationModel.findOne( {name:req.body.station}, function( err, station ){
    */
        TradeModel.findById( req.params.id, function (err, trade) {
        if (trade.user != req.session.auth.userId){
            console.log('Recipient not the one trying to delete');
            console.log(msg.recipient);
            console.log(req.session.auth.userId);
            res.json({error:"Recipient not user attempting to delete"});
        }
        return trade.remove(function(err){
            console.log('Removed trade');
            if (!err) {
            res.json({success:true});
            } else {
            res.json({error:err});
            }
        });
        });
    });
};


    
exports.put = function(req, res){
    requireAdmin(req, res, function( req, res) {   /*
    // Create new StationModel after authentication, authorization and data validation
    if (! req.loggedIn) {
        res.json({error:'Not logged in'});
        return;
    }
    // Verify admin
    UserModel.findById(req.session.auth.userId, function( err, user ) {
        if (user.is_admin) {
            */                   
            //console.log(req.body);
 
            StationModel.findOne( {name:req.body.name}, function( err, station ){
                if (station){
                    console.log(station);
                    res.json({error:'Station already exists'});
                } else {
                    var newstation = new StationModel({
                        name: req.body.name,
                        location: { // Let mongoose validate this data
                            x: req.body.x,
                            y: req.body.y,
                            z: req.body.z
                        },
                        system: req.body.system
                    });
                    newstation.save( function (err) {
                        if (err) {
                            res.json({error:err});
                        } else {
                            res.json({success:true});
                        }
                    });
                }
            });
            /*
        } else {
            res.json({error:'Not an admin'});
        }
*/
    });
};

