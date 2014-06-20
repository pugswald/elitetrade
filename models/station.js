var mongoose = require('mongoose'),
    Schema = mongoose.Schema,
    ObjectId = Schema.ObjectId;
  
/**
* Schema
*/
var StationSchema = Schema({
    name: String,
    name_lower: String, // For indexed case insensitive searches
    location: {
      x: Number,
      y: Number,
      z: Number
    },
    system: String,
    commodities:[{
      commodity: { type: ObjectId, ref: 'CommodityModel'},
      demand: String,
      supply: String,
      lastBuy: Number,
      lastSell: Number
    }]
});

mongoose.model('StationModel', StationSchema);
