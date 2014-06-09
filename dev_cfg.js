var fs = require('fs');
var cert_dir='/home/harry/cert/';
module.exports = {
  debug: true,
  appId:'146859758845213',
  appSecret:'9cc7321626fde516d3cb954bd7721be3',
  myHostname:'https://192.168.72.25:3000',
  host:'192.168.72.25',
  credentials : {
    key: fs.readFileSync(cert_dir+'server.key')
    ,cert: fs.readFileSync(cert_dir+'server.crt')
  }
};
