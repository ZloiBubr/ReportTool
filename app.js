/**
 * Module dependencies.
 */

var express = require('express');
var jira = require('./routes/updatejira');
var velocity = require('./routes/calcvelocitydata');
var weekly = require('./routes/calcweeklyprogress');
var pagebysize = require('./routes/calcpagebysize');
var pagedata = require('./routes/getpagedata');
var progress = require('./routes/calcprogress');
var wave = require('./routes/calcwave');
var personaldata = require('./routes/personaldata');
var http = require('http');
var path = require('path');
var config = require('./config');
var log = require('./libs/log')(module);

var app = express();

// all environments
app.engine('ejs', require('ejs-locals'));
app.set('view engine', 'ejs');
app.set('views', __dirname + '/views');
app.engine('html', require('ejs').renderFile);
app.use(express.favicon());

if (app.get('env') == 'development') {
    app.use(express.logger('dev'));
}
else {
    app.use(express.logger('default'));
}

app.use(express.json());
app.use(express.urlencoded());
app.use(express.methodOverride());
app.use(express.cookieParser(config.get('appSecret')));
app.use(express.session());
app.use(app.router);
require('./routes')(app);
app.use(express.static(path.join(__dirname, 'public')));

// development only
if ('development' == app.get('env')) {
    app.use(express.errorHandler());
}


app.get('/update_progress', function (req, res) {
    req.socket.setTimeout(1000 * 60 * 10);
    res.writeHead(200, {'Content-Type': 'text/event-stream'});
    jira.rememberResponse(res);
});

//handlers
app.post('/updatejira', jira.post);

//json
app.get('/velocitydata', velocity.get);
app.get('/progressdata', progress.get);
app.get('/weeklydata', weekly.get);
app.get('/pagebysizedata', pagebysize.get);
app.get('/pagedata/:id', pagedata.get);
app.get('/wavedata', wave.get);
app.get('/personaldata', personaldata.get);


http.createServer(app).listen(config.get('port'), function () {
    log.info('Express server listening on port ' + config.get('port'));
});
