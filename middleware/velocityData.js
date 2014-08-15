var mongoose = require('../libs/mongoose');
var velocityModel = require('../models/velocity').data;
var Module = require('../models/module').Module;
var Page = require('../models/page').Page;
var log = require('../libs/log')(module);

exports.getData = function (req, res) {
    parsePages(function (err, velocity) {
        if (err) throw err;
        res.json(velocity);
    });
};

function parsePages(callback) {
    var velocity = new velocityModel();
    for (var k = 0; k < velocity.data.length; k++) {
        var team = velocity.data[k];
        team.data = [];
    }
    //1. grab all pages
    Page.find({}).exec(function (err, pages) {
        for (var i = 0; i < pages.length; i++) {
            var page = pages[i];
            var storyPoints = parseFloat(page.storyPoints) == null ? 0 : parseFloat(page.storyPoints);
            if(!storyPoints) {
                continue;
            }
            var teamName = getTeamName(page.labels);
            for (var j = 0; j < page.progressHistory.length; j++) {
                var history = page.progressHistory[j];
                var date = new Date(Date.parse(history.dateChanged));
                date.setHours(12, 0, 0, 0);
                date = date.getTime();
                var from = parseInt(history.progressFrom);
                if(from > 1) {
                    if(history.progressTo == '0' ||
                        history.progressTo == '1' ||
                        history.progressTo == '' ||
                        history.progressTo == null)
                        continue;
                }
                var to = history.progressTo == null || history.progressTo == '' ? 0 : parseInt(history.progressTo);
                var progress = to - from;
                var calcStoryPoints = storyPoints * progress / 100;
                putDataPoint(velocity, teamName, date, calcStoryPoints);
            }
        }

        //2. sort
        for (var k = 0; k < velocity.data.length; k++) {
            var team = velocity.data[k];
            team.data.sort(function (a, b) {
                a = new Date(a[0]);
                b = new Date(b[0]);
                return a > b ? 1 : a < b ? -1 : 0;
            });
        }
        //3. summ
        for (var k = 0; k < velocity.data.length; k++) {
            var team = velocity.data[k];
            for (var l = 0; l < team.data.length - 1; l++) {
                var teamData1 = team.data[l];
                var teamDataPoints = teamData1[1];
                var teamData2 = team.data[l + 1];
                var teamDataPoints2 = teamData2[1];

                teamData2[1] = teamDataPoints + teamDataPoints2;
            }
        }
        callback(err, velocity);
    })
}

function getTeamName(labels) {
    if (labels.indexOf("TeamRenaissance") > -1)
        return "TeamRenaissance";
    if (labels.indexOf("TeamInspiration") > -1)
        return "TeamInspiration";
    if (labels.indexOf("TeamNova") > -1)
        return "TeamNova";
    if (labels.indexOf("TeamLiberty") > -1)
        return "TeamLiberty";
    if (labels.indexOf("TeamViva") > -1)
        return "TeamViva";
}

function putDataPoint(velocity, teamName, date, calcStoryPoints) {
    for (var k = 0; k < velocity.data.length; k++) {
        var team = velocity.data[k];
        if (team.name == teamName) {
            var found = false;
            for (var l = 0; l < team.data.length; l++) {
                var teamData = team.data[l];
                var teamDataDate = teamData[0];
                var teamDataPoints = teamData[1];
                if ((teamDataDate - date) == 0) {
                    found = true;
                    teamData[1] = teamDataPoints + calcStoryPoints;
                    return;
                }
            }
            if (!found) {
                team.data.push([date, calcStoryPoints]);
                return;
            }
        }
    }
}
