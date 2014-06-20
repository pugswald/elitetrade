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
var MAX_RETURN = 200; // Don't let anyone query more than 200
// Column order as defined in the tabledata client object
var column_order = ['id', 'user', 'executed', 'station.name', 'commodity.name', 'amount', 'price', 'bought'];


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




exports.get = function(req, res){
    // Assumes data is consumed by a datatable.  Server-side view modifications apply
    // Searches only for trade by current user at the moment
    // TODO: Available search parameters:
    //   station
    //   commodity
    //   user
    //   page
    //   rpp
    // By default, will return the last 10 trades
    console.log(req.query);
    var q = {};
    var limit = 10;
    var sort_str = 'field -executed';
    try {
        if (req.query.length) limit = req.query.length;
        if (req.query.search.value){
            q = { name_lower: {$regex: '^'+req.query.search.value.toLowerCase()} };
        }
        if (req.query.order[0].column){
            sort_str = 'field ';
            if (req.query.order[0].dir == 'desc') sort_str = sort_str+'-';
            sort_str = sort_str + column_order[req.query.order[0].column];
            //console.log('Sort by '+sort_str);
        }
    } catch (err) {
        console.log('Invalid query recieved');
    }
    if (limit > MAX_RETURN) limit=MAX_RETURN;
    TradeModel.find(q)
        .limit(limit)
        .populate('user','handle')
        .populate('station','name')
        .populate('commodity','name')
        .select('user executed station commodity amount price bought')
        .sort(sort_str)
        .exec(function (err,trades) {
            if (!err) {
                TradeModel.count( {}, function (err, total_count){
                    TradeModel.count( q, function (err, count){
                        var response = {draw:parseInt(req.query.draw), recordsTotal:total_count, recordsFiltered:count}
                        var data = []
                        for (var i=0; i<trades.length; ++i){
                            var t = trades[i];
                            data.push([t._id,t.user.handle,t.executed,t.station.name,t.commodity.name,t.amount, t.price, t.bought,null]);                        
                        }
                        response.data = data;
                        res.json(response);
                    });
                });
            } else {
                res.json({error:err});
            }
        });
 };


exports.delete = function(req, res){
    if (req.loggedIn) { 
        TradeModel.findById( req.params.id, function (err, trade) {
            if (trade.user != req.session.auth.userId){
                console.log('Recipient not the one trying to delete');
                console.log(msg.recipient);
                console.log(req.session.auth.userId);
                res.json({error:"Recipient not user attempting to delete"});
            } else {
                trade.remove(function(err){
                    console.log('Removed trade');
                    if (!err) {
                        res.json({success:true});
                    } else {
                        res.json({error:err});
                    }
                });
            }
        });
    } else {
        res.json({error:'Not logged in'});
    }
};


exports.put = function(req, res){
//	console.log(req.loggedIn);
//	console.log(req.session);
//	console.log(res.locals);
    if (! req.loggedIn) {
        res.json({error:'Not logged in'});
        return;
    } 
    // Data validation
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

    if (req.body.id) {
        res.json({error:'Modify trade not implemented'});
        return;
    }
    StationModel.findOne( {name:req.body.station}, function (err, station) {
        if (! station){
            res.json({error:'Invalid station'});
            return;
        }
        CommodityModel.findOne( {name:req.body.commodity}, function (err, commodity){
            if (! commodity){
                res.json({error:'Invalid commodity'});
                return;
            }
            // TODO: Modify trade
            var newtrade = new TradeModel({
                station: station,
                user: req.session.auth.userId, // TODO: Need to get user?
                commodity: commodity,
                amount: amount_clean,
                price: price_clean,
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
        });
    });
};
