var express = require('express');
var router = express.Router();

var jira = require('../routes/updatejira');
var updatelabels = require('../routes/updateLabels');
var velocity = require('../routes/calcvelocitydata');
var weekly = require('../routes/calcweeklyprogress');
var pagebysize = require('../routes/calcpagebysize');
var normalized = require('../routes/normalizeddata');
var pagedata = require('../routes/getpagedata');
var progress = require('../routes/calcprogress');
var wavedata = require('../routes/calcwave');
var moduledata = require('../routes/calcmodule');
var personaldata = require('../routes/personaldata');
var versiondata = require('../routes/versiondata');
var acceptanceStatistics = require('../routes/acceptanceStatistics');
var cloudappsdata = require('../routes/getcloudappsdata');
var issuesDataRouter = require('../routes/issuesDataRouter');
var checkListRouter = require('../routes/getCheckList');
var bugListRouter = require('../routes/getBugs');
var ClearDB = require('../middleware/createDb').Clear;

/* GET home page. */
router.get('/', function(req, res) {
    res.render('index', { title: 'PLEX-UXC Report Tool' });
});

//json
router.post('/updatejira', jira.post);
router.post('/updatelabels', updatelabels.post);
router.get('/velocitydata', velocity.get);
router.get('/progressdata', progress.get);
router.get('/weeklydata', weekly.get);
router.get('/pagebysizedata', pagebysize.get);
router.get('/normalizeddata', normalized.get);
router.get('/pagedata/:id', pagedata.get);
router.get('/wavedata', wavedata.get);
router.get('/moduledata', moduledata.get);
router.get('/personaldata/:fromDate/:toDate', personaldata.get);
router.get('/issuesdata', issuesDataRouter.get);
router.get('/versiondata', versiondata.get);
router.get('/acceptanceStatistics', acceptanceStatistics.get);
router.get('/cloudappsdata', cloudappsdata.get);
router.get('/checklistDueDateStatistic', checkListRouter.get);
router.get('/bugDueDateStatistic', bugListRouter.get);

router.get('/update_progress', function (req, res) {
    req.socket.setTimeout(1000 * 60 * 10);
    res.writeHead(200, {'Content-Type': 'text/event-stream'});
    jira.rememberResponse(req, res);
});
router.get('/update_labels', function (req, res) {
    req.socket.setTimeout(1000 * 60 * 10);
    res.writeHead(200, {'Content-Type': 'text/event-stream'});
    updatelabels.rememberResponse(req, res);
});

//handlers
router.get('/cleandb', function(req, res) {
    ClearDB(res, function (err, res) {
        if (err) {
            var errMessage = "!!!!!!!!!!!!!!!!!!!! DB Cleanup error happened!";
            log.error(errMessage);
            log.error(err);
            res.send(403, errMessage);
        }
        else {
            res.send(200, 'OK');
        }
    });
});

module.exports = router;
