var mongoose = require('mongoose'),
    Schema = mongoose.Schema;
  
/**
* Schema
*/
var CommoditySchema = Schema({
    name: String,
    name_lower: String,
    galavg: Number
});

mongoose.model('CommodityModel', CommoditySchema);
