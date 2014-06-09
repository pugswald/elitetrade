/**
 * Global config
 */
var mycfg = require('./dev_cfg.js');

/**
 * Module dependencies.
 */
// TODO: switch for dev/production environments
var express = require('express')
  , https = require('https')
//  , http = require('http')
  , path = require('path')
  , fs = require('fs')
  , everyauth = require('everyauth')
  , mongoose = require('mongoose')
//  , KeystoreProvider = require('./keystoreprovider').KeystoreProvider; // This is dead code

mongoose.set('debug',mycfg.debug); //dev
/** Connect to database and load models **/
mongoose.connect('mongodb://127.0.0.1/elite-trade');
/**var models_path = './models';
fs.readdirSync(models_path).forEach(function (file) {
    require(models_path+'/'+file)
});
**/
require('./models/user.js');
var UserModel = mongoose.model('UserModel');
require('./models/trade.js');
require('./models/commodity.js');
require('./models/station.js');
//require('./models/system.js');


everyauth.everymodule.findUserById(function(userId,callback) {
    UserModel.findOne({_id: userId},function(err, user) {
      callback(user, err);
    });
});
everyauth
  .facebook
    .appId(mycfg.appId)
    .appSecret(mycfg.appSecret) 
    .myHostname(mycfg.myHostname) 
    //.scope('publish_actions')  // Don't need this yet
    .handleAuthCallbackError( function (req, res) {
      console.log('Auth error');
      // Use the default fallback
    })
    .findOrCreateUser( function (session, accessToken, accessTokExtra, fbUserMetadata) {
        var promise = this.Promise();
        UserModel.findOne({facebook_id: fbUserMetadata.id},function(err, user) {
            if (err) return promise.fulfill([err]);
            if(user) {
                // user found, life is good
                promise.fulfill(user);
            } else {
                // create new user
                var User = new UserModel({
                    facebook_id: fbUserMetadata.id,  // TODO: move into facebook dict
                    last_modified: new Date(),
                    facebook: fbUserMetadata
                });
                User.save(function(err,user) {
                    if (err) return promise.fulfill([err]);
                    promise.fulfill(user);
                });
            }
        });
        return promise;
    })
    .redirectPath('/');



var app = express();

// all environments
app.configure(function(){
  if ('host' in mycfg) {
    app.set('host', '192.168.72.25'); // Needed for testing inside the firewall with facebook auth
  }
  app.set('port', process.env.PORT || 3000);
  app.set('views', __dirname + '/views');
  app.set('view engine', 'jade');
  app.use(express.favicon());
  app.use(express.logger('dev'));
  app.use(express.bodyParser());
  app.use(express.methodOverride());
  app.use(express.cookieParser());
  app.use(express.session({secret:'Not sure what this is about'}));
  app.use(everyauth.middleware(app)); // important to call this AFTER session!
  app.use(app.router);
  app.use(require('stylus').middleware(__dirname + '/public'));
  if (! mycfg.debug) {
    app.use(require('express-uglify').middleware({src: __dirname+'/public'}));
  }
  app.use(express.static(path.join(__dirname, 'public')));
  app.use('/static',express.static(path.join(__dirname, '/vendor')));

  // development only
  console.log('App env is '+app.get('env'));
  if ('development' == app.get('env')) {
    app.use(express.errorHandler());
  }
    
});
var routes=require('./routes')
  ,user=require('./routes/user')
  ,trade=require('./routes/trade');
app.get('/', routes.index);
app.get('/trade', trade.trade_get);
app.put('/trade', trade.trade_put);
app.delete('/trade/:id', trade.trade_delete);
app.get('/user', user.user_get);
app.post('/user', user.user_post);
app.delete('/user', user.user_delete);
//app.get('/invite', user.user_invite);

https.createServer(mycfg.credentials,app).listen(app.get('port'), function(){
  console.log('Express server listening on port ' + app.get('port'));
});
/*http.createServer(app).listen(app.get('port'), function(){
  console.log('Express server listening on port ' + app.get('port'));
});
*/