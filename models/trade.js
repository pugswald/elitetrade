var mongoose = require('mongoose'),
    Schema = mongoose.Schema,
    ObjectId = Schema.ObjectId;
  
/**
* Schema
*/
var TradeSchema = Schema({
    station: { type: ObjectId, ref: 'StationModel'},
    user: { type: ObjectId, ref: 'UserModel'},
    commodity: { type: ObjectId, ref: 'CommodityModel'},
    amount: { type: Number, min: 1, max: 1000 },
    price: Number,
    executed: { type: Date, default: Date.now },
    downvotes: [{ type: ObjectId, ref: 'UserModel'}], // Way to tag bad trades, one per user allowed
    bought: Boolean // If bought is false, assume sold
});

mongoose.model('TradeModel', TradeSchema);
