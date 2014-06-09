var mongoose = require('mongoose'),
    Schema = mongoose.Schema;
  
/**
* Schema
*/
var CommoditySchema = Schema({
    name: String,
    galavg: Number
});

mongoose.model('CommodityModel', CommoditySchema);
