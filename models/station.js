var mongoose = require('mongoose'),
    Schema = mongoose.Schema,
    ObjectId = Schema.ObjectId;
  
/**
* Schema
*/
var StationSchema = Schema({
    name: String,
    location: {
      x: Number,
      y: Number,
      z: Number,
    },
    system: String,
    commodities:[{
      commodity: ObjectId,
      demand: String,
      supply: String,
      lastBuy: Number,
      lastSell: Number
    }]
});

mongoose.model('StationModel', StationSchema);
