
/**
 * Module dependencies.
 */

var express = require('express');
var routes = require('./routes');
var user = require('./routes/user');
var updatejira = require('./routes/updatejira');
var calcvelocitydata = require('./routes/calcvelocitydata');
var calcprogress = require('./routes/calcprogress');
var http = require('http');
var path = require('path');
var config = require('./config');
var log = require('./libs/log')(module);

var app = express();

// all environments
app.engine('ejs', require('ejs-locals'));
app.set('views', path.join(__dirname, 'template'));
app.set('view engine', 'ejs');
app.use(express.favicon());

if(app.get('env') == 'development'){
    app.use(express.logger('dev'));
}
else{
    app.use(express.logger('default'));
}

app.use(express.json());
app.use(express.urlencoded());
app.use(express.methodOverride());
app.use(express.cookieParser(config.get('appSecret')));
app.use(express.session());
app.use(app.router);
app.use(express.static(path.join(__dirname, 'public')));

// development only
if ('development' == app.get('env')) {
  app.use(express.errorHandler());
}

app.get('/', routes.index);
app.get('/updatejira', updatejira.get);
app.post('/updatejira', updatejira.post);
app.get('/velocitydata', calcvelocitydata.get);
app.get('/progressdata', calcprogress.get);

http.createServer(app).listen(config.get('port'), function(){
  log.info('Express server listening on port ' + config.get('port'));
});
