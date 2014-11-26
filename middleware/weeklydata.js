var mongoose = require('../libs/mongoose');
var Module = require('../models/module').Module;
var Page = require('../models/page').Page;
var log = require('../libs/log')(module);
var helpers = require('../middleware/helpers');

exports.getData = function (req, res) {
    parsePages(function (err, velocity) {
        if (err) throw err;
        res.json(velocity);
    });
};

function getNextSunday(d) {
    d = new Date(d);
    var day = d.getDay(),
        diff = d.getDate() - day + (day == 0 ? 0:7); // adjust when day is sunday
    return new Date(d.setDate(diff));
}

function parsePages(callback) {
    var velocity = { data: []};
    for (var k = 0; k < velocity.data.length; k++) {
        var team = velocity.data[k];
        team.data = [];
    }
    //1. grab all pages
    Page.find({}).exec(function (err, pages) {
        for (var i = 0; i < pages.length; i++) {
            var page = pages[i];
            var storyPoints = page.storyPoints == null ? 0 : parseFloat(page.storyPoints);
            var teamName = helpers.getTeamName(page.labels);
            for (var j = 0; j < page.progressHistory.length; j++) {
                var history = page.progressHistory[j];
                var date = new Date(Date.parse(history.dateChanged));
                date.setHours(12, 0, 0, 0);
                date = getNextSunday(date.getTime()).getTime();
                var from = parseInt(history.progressFrom);
                var to = history.progressTo == null || history.progressTo == '' ? 0 : parseInt(history.progressTo);
                var progress = to - from;
                var calcStoryPoints = storyPoints * progress / 100;
                putDataPoint(velocity, teamName, date, calcStoryPoints);
                putDataPoint(velocity, "Total", date, calcStoryPoints);
            }
        }

        //2. sort
        for (var k = 0; k < velocity.data.length; k++) {
            var team = velocity.data[k];
            team.data.sort(function (a, b) {
                var aa = new Date(a.x);
                var bb = new Date(b.x);
                return aa > bb ? 1 : aa < bb ? -1 : 0;
            });
            for (var l = 0; l < team.data.length; l++) {
                team.data[l].y = Math.round(team.data[l].y*10)/10;
            }
        }
        callback(err, velocity);
    })
}

function putDataPoint(velocity, teamName, date, calcStoryPoints) {
    var teamObj = null;
    for (var k = 0; k < velocity.data.length; k++) {
        if (velocity.data[k].name == teamName) {
            teamObj = velocity.data[k];
            break;
        }
    }
    if(!teamObj) {
        teamObj = { name: teamName, data: []};
        velocity.data.push(teamObj);
    }
    var found = false;
    for (var l = 0; l < teamObj.data.length; l++) {
        var teamData = teamObj.data[l];
        if ((teamData.x - date) == 0) {
            found = true;
            teamData.y += calcStoryPoints;
            break;
        }
    }
    if (!found) {
        teamObj.data.push({ x: date, y: calcStoryPoints });
    }
}
