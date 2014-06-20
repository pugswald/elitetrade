/*
 * GET commodities for tabledata
 * PUT create or modify commodity
 * DELETE delete commodity
 */
var mongoose = require('mongoose');
var CommodityModel = mongoose.model('CommodityModel');
var UserModel = mongoose.model('UserModel');

var column_order = ['id', 'name', 'galavg'];

// TODO: Move this decorator into a common calling place
var requireAdmin = function( req, res, callback ) {
    // Verify the requestor is an admin and do the callback
    if (! req.loggedIn) { 
        res.json({error:'Not logged in'});
        return;
    }
    UserModel.findById(req.session.auth.userId, function( err, user ) {
        if (user.is_admin) {
            callback( req, res );
        }  else {
            res.json({error:'Not an admin'});
        }
    });
};

exports.get = function(req, res){
    // Assumes data is consumed by a datatable.  Server-side view modifications apply
    // On any deviation from the query format of datatable, it will return the first 
    //   10 commodities alphabetically
    // Adding the query term will cause it to do a name search and return a list of matching commodity names
    if (req.query.term) {
        CommodityModel.find({ name_lower: {$regex: '^'+req.query.term.toLowerCase()} })
        .select('name')
        .sort('field name')
        .exec(function (err,commodities) {
            if (!err) {
                var data = []
                for (var i=0; i<commodities.length; ++i){
                    var s = commodities[i];
                    data.push( s.name);                        
                }
                res.json(data);
            } else {
                res.json({error:err});
            }
        });
        return
    }
    console.log(req.query);
    var q = {};
    var limit = 10;
    var sort_str = 'field name';
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
    CommodityModel.find(q)
        .limit(limit)
        .select('name galavg')
        .sort(sort_str)
        .exec(function (err,commodities) {
            if (!err) {
                CommodityModel.count( {}, function (err, total_count){
                    CommodityModel.count( q, function (err, count){
                        var response = {draw:parseInt(req.query.draw), recordsTotal:total_count, recordsFiltered:count}
                        var data = []
                        for (var i=0; i<commodities.length; ++i){
                            var s = commodities[i];
                            data.push([s._id,s.name,s.galavg]);                        
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
    requireAdmin(req, res, function(req, res){
        // TODO: more remove parameters added to findOne
        // TODO: Remove dependent data from other collections
        CommodityModel.findByIdAndRemove(  req.body.id, function (err) {
            console.log('Removed commodity '+req.body.name);
            if (!err) {
                res.json({success:true});
            } else {
                res.json({error:err});
            }
        });
    });
};


    
exports.put = function(req, res){
    requireAdmin(req, res, function( req, res) {  
        var newname = req.body.name;
        newname = newname.replace(/^\s*/,'');
        newname = newname.replace(/\s*$/,'');
        if (! newname){
            res.json({error:'Blank commodity name'});
            return;
        }
        if (req.body.id) {
            console.log('ID passed in '+req.body.id);
            // Modify 
            CommodityModel.findOne( {name:req.body.name}, function( err, commodity ){
                if (commodity && commodity.id != req.body.id) {
                    console.log(commodity);
                    res.json({error:'Commodity already exists'});
                } else {
                    CommodityModel.findByIdAndUpdate(req.body.id, {
                        name: newname,
                        name_lower: newname.toLowerCase(),
                        galavg: req.body.galavg
                        }, function (err) {
                            if (err) {
                                res.json({error:err});
                            } else {
                                res.json({success:true});
                            }
                        }                    
                    );
                }
            });
        } else {
            CommodityModel.findOne( {name:req.body.name}, function( err, commodity ){
                if (commodity) {
                    console.log(commodity);
                    res.json({error:'Commodity already exists'});
                } else {
                    var newcommodity = new CommodityModel({
                        name: newname,
                        name_lower: newname.toLowerCase(),
                        galavg: req.body.galavg
                    });
                    newcommodity.save( function (err) {
                        if (err) {
                            res.json({error:err});
                        } else {
                            res.json({success:true});
                        }
                    });
                }
            });
        }
    });
};

