/*
 * GET stations for tabledata
 * PUT create or modify station
 * DELETE delete station
 */
var mongoose = require('mongoose');
var CommodityModel = mongoose.model('CommodityModel');
var StationModel = mongoose.model('StationModel');
var UserModel = mongoose.model('UserModel');

var column_order = ['id', 'name', 'system', 'location.x', 'location.y', 'location.y'];

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
    //   10 stations alphabetically
    // Adding the query term will cause it to do a name search and return a list of matching station names
    if (req.query.term) {
        StationModel.find({ name_lower: {$regex: '^'+req.query.term.toLowerCase()} })
        .select('name')
        .sort('field name')
        .exec(function (err,stations) {
            if (!err) {
                var data = []
                for (var i=0; i<stations.length; ++i){
                    var s = stations[i];
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
    StationModel.find(q)
        .limit(limit)
        .select('name system location')
        .sort(sort_str)
        .exec(function (err,stations) {
            if (!err) {
                StationModel.count( {}, function (err, total_count){
                    StationModel.count( q, function (err, count){
                        var response = {draw:parseInt(req.query.draw), recordsTotal:total_count, recordsFiltered:count}
                        var data = []
                        for (var i=0; i<stations.length; ++i){
                            var s = stations[i];
                            data.push([s._id,s.name,s.system,s.location.x,s.location.y,s.location.z,null]);                        
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
        StationModel.findByIdAndRemove(  req.body.id, function (err) {
            console.log('Removed station '+req.body.name);
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
            res.json({error:'Blank station name'});
            return;
        }
        if (req.body.id) {
            console.log('ID passed in '+req.body.id);
            // Modify 
            StationModel.findOne( {name:req.body.name}, function( err, station ){
                if (station && station.id != req.body.id) {
                    console.log(station);
                    res.json({error:'Station already exists'});
                } else {
                    StationModel.findByIdAndUpdate(req.body.id, {
                        name: newname,
                        name_lower: newname.toLowerCase(),
                        location: { // Let mongoose validate this data - apparently null is ok
                            x: req.body.x,
                            y: req.body.y,
                            z: req.body.z
                        },
                        system: req.body.system
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
            StationModel.findOne( {name:req.body.name}, function( err, station ){
                if (station) {
                    console.log(station);
                    res.json({error:'Station already exists'});
                } else {
                    var newstation = new StationModel({
                        name: newname,
                        name_lower: newname.toLowerCase(),
                        location: { // Let mongoose validate this data - apparently null is ok
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
        }
    });
};

