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
}




exports.trade_get = function(req, res){
  // TODO: Available search parameters:
  //   station
  //   commodity
  //   user
  //   page
  //   rpp
  // By default, will return the last 10 trades
//	console.log(req.loggedIn);
//	console.log(req.session);
//	console.log(res.locals);
/*
  if (req.loggedIn) { // TODO: This shouldn't work
    return MessageModel.find( {recipient: req.session.auth.userId},null,{sort:{_id:-1}},function (err,msgs) {
      if (!err) {
        res.json(msgs);
      } else {
        res.json({error:err});
      }
    });
  } else {
    res.json({error:'Not logged in'});
  }*/
//  return TradeModel.find( {recipient: req.session.auth.userId},null,{sort:{_id:-1}},function (err,msgs) {
  return TradeModel.find( {user: req.session.auth.userId} )
    .limit(10)
    .sort('-executed')
    .exec(function (err,msgs) {
      if (!err) {
        res.json(msgs);
      } else {
        res.json({error:err});
      }
    });
};


exports.trade_delete = function(req, res){
  if (req.loggedIn) { 
    return TradeModel.findById( req.params.id, function (err, trade) {
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
  } else {
    res.json({error:'Not logged in'});
  }
};


exports.trade_put = function(req, res){
//	console.log(req.loggedIn);
//	console.log(req.session);
//	console.log(res.locals);
  if (! req.loggedIn) {
    res.json({error:'Not logged in'});
    return;
  } 
  // Data validation
  var station = StationModel.findOne( {_id:req.body.station});
  if (! station){
    res.json({error:'Invalid station'});
    return;
  }
    //user: ObjectId,
  var commodity = CommodityModel.findOne( {_id:req.body.commodity});
  if (! commodity){
    res.json({error:'Invalid commodity'});
    return;
  }
  var amount_clean = getPosInt(req.body.amount)
  if (amount_clean == 0) {
    res.json({error:'Bad amount'});
    return;
  }
  var price_clean = getPosInt(req.body.price)
  if (price_clean == 0) {
    res.json({error:'Bad price'});
    return;
  }
    //executed: Date,  // Taken care of by schema
    //downvotes: [ObjectId], // Way to tag bad trades, one per user allowed
  var bought = true; // Not worried about crap on this attribute
  if ( req.body.action == "sell" ) bought = false;
    
  var newtrade = new TradeModel({
    station: station,
    user: req.session.auth.userId, // TODO: Need to get user?
    commodity: commodity,
    amount: amount_clean,
    price: price_clean,
    //executed: { type: Date, default: Date.now }
    //downvotes: [ObjectId], // Way to tag bad trades, one per user allowed
    bought: bought // If bought is false, assume sold

  });
  newtrade.save( function (err) {
    if (err) {
      res.json({error:err});
    } else {
      res.json({success:true});
    }
  });
};
