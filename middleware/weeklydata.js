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
}

function RoundDateToSunday(date) {
    var daysMonth = [31,30,28,31,30,31,30,31,31,30,31,30,31];
    var day = date.getDay();
    var diff = day == 0 ? 0 : 7 - day;
    var newDate = date.getDate() + diff;

    var month = date.getMonth();
    var days = daysMonth[month];
    if(newDate > days) {
        if(month < 12) {
            date.setMonth(month + 1);
        }
        else {
            date.setMonth(0);
            date.setYear(date.getYear() + 1);
        }
        newDate = newDate - days;
    }

    date.setDate(newDate);
}

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
            var storyPoints = parseInt(page.storyPoints) == null ? 0 : parseInt(page.storyPoints);
            var teamName = getTeamName(page.labels);
            for (var j = 0; j < page.progressHistory.length; j++) {
                var history = page.progressHistory[j];
                var date = new Date(Date.parse(history.dateChanged));
                date.setHours(12, 0, 0, 0);
                RoundDateToSunday(date);
                date = date.getTime();
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
                a = new Date(a[0]);
                b = new Date(b[0]);
                return a > b ? 1 : a < b ? -1 : 0;
            });
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
