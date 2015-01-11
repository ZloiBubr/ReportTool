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
    var velocity = { data: [], years: []};
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
                var norm_date = new Date(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
                norm_date = getNextSunday(norm_date.getTime()).getTime();
                var from = parseInt(history.progressFrom);
                var to = history.progressTo == null || history.progressTo == '' ? 0 : parseInt(history.progressTo);
                var progress = to - from;
                var calcStoryPoints = storyPoints * progress / 100;
                putDataPoint(velocity, teamName, date, norm_date, calcStoryPoints);

                if (teamName != "Automation") {
                    putDataPoint(velocity, "Total", date, norm_date, calcStoryPoints);
                };
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
        velocity.years.sort(function(a,b) {
            var aa = a.name;
            var bb = b.name;
            return aa > bb ? 1 : aa < bb ? -1 : 0;
        });
        for (var k = 0; k < velocity.years.length; k++) {
            var year = velocity.years[k];
            year.teams.sort(function (a, b) {
                var aa = a.name;
                var bb = b.name;
                if(aa == "Total") {
                    return 1;
                }
                if(bb == "Total") {
                    return -1;
                }
                return aa > bb ? 1 : aa < bb ? -1 : 0;
            });
        }
        callback(err, velocity);
    })
}

function putDataPoint(velocity, teamName, date, norm_date, calcStoryPoints) {
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
        if ((teamData.x - norm_date) == 0) {
            found = true;
            teamData.y += calcStoryPoints;
            break;
        }
    }
    if (!found) {
        teamObj.data.push({ x: norm_date, y: calcStoryPoints });
    }
    processMonthlyData(velocity, teamName, date, calcStoryPoints);
}

function processMonthlyData(velocity, teamName, date, calcStoryPoints) {
    if(teamName == "--") {
        return;
    }

    var year = (new Date(date)).getUTCFullYear();
    var month = (new Date(date)).getUTCMonth();

    var teamObj = null;
    var yearObj = null;

    //team
    for (var k = 0; k < velocity.years.length; k++) {
        if (velocity.years[k].name == year) {
            yearObj = velocity.years[k];
            break;
        }
    }
    if(!yearObj) {
        yearObj = {
            name: year,
            teams: []
        };
        velocity.years.push(yearObj);
    }
    //year
    for (var l = 0; l < yearObj.teams.length; l++) {
        if (yearObj.teams[l].name == teamName) {
            teamObj = yearObj.teams[l];
            break;
        }
    }
    if (!teamObj) {
        teamObj = {
            name: teamName,
            months: [0,0,0,0,0,0,0,0,0,0,0,0]
        };
        yearObj.teams.push(teamObj);
    }
    teamObj.months[month] += calcStoryPoints;
}
