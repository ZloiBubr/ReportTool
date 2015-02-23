var mongoose = require('../libs/mongoose');
var Module = require('../models/module').Module;
var Page = require('../models/page').Page;
var log = require('../libs/log')(module);
var helpers = require('../middleware/helpers');
var cache = require('node_cache');

var SP_TYPE = {
    DEV : 1,
    QA : 2,
    SME : 3
};

exports.getData = function (req, res) {

    cache.getData("weeklyData",function(setterCallback){
        parsePages(function (err, data) {
            if (err) throw err;
            setterCallback(data);
        });
    }, function(value){res.json(value);});
};

function getNextSunday(d) {
    d = new Date(d);
    var day = d.getDay(),
        diff = d.getDate() - day + (day == 0 ? 0:7); // adjust when day is sunday
    return new Date(d.setDate(diff));
}

function getDates (d){
    var date = typeof d == 'string' ? new Date(d) : d;
    //var date = new Date(Date.parse(d));
    var norm_date = new Date(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
    return{ date: date, norm_date: getNextSunday(norm_date.getTime()).getTime() };
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
                var dates = getDates(history.dateChanged);
                var from = parseInt(history.progressFrom);
                var to = history.progressTo == null || history.progressTo == '' ? 0 : parseInt(history.progressTo);
                var progress = to - from;
                var calcStoryPoints = storyPoints * progress / 100;
                var bonusCalcStoryPoints = (storyPoints * 0.7) * progress / 100;
                putDataPoint(velocity, teamName, dates.norm_date, calcStoryPoints);
                putTotalDataPoint(velocity, teamName, dates.norm_date, calcStoryPoints);

                processMonthlyData(velocity, teamName, dates.date, bonusCalcStoryPoints, calcStoryPoints, SP_TYPE.DEV);
                putTotalMonthlyPoint(velocity, teamName, dates.date, calcStoryPoints);

            }
            if(page.qaFinished){
                var dates = getDates(page.qaFinished);
                //var bonusCalcStoryPoints = storyPoints * 20 / 100;
                processMonthlyData(velocity, teamName, dates.date, storyPoints * 20 / 100, 0, SP_TYPE.QA);
                //putTotalMonthlyPoint(velocity, teamName, dates.date, bonusCalcStoryPoints);
            }
            if(page.smeFinished){
                var dates = getDates(page.smeFinished);
                //var bonusCalcStoryPoints = storyPoints * 10 / 100;
                processMonthlyData(velocity, teamName, dates.date, storyPoints * 10 / 100, 0, SP_TYPE.SME);
                //putTotalMonthlyPoint(velocity, teamName, dates.date, bonusCalcStoryPoints);
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

function putTotalDataPoint(velocity, teamName, norm_date, calcStoryPoints) {
    if (teamName != "Automation") {
        putDataPoint(velocity, "Total", norm_date, calcStoryPoints);
    }
}

function putDataPoint(velocity, teamName, norm_date, calcStoryPoints) {
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
}

function putTotalMonthlyPoint(velocity, teamName, date, calcStoryPoints) {
    if (teamName != "Automation") {
        processMonthlyData(velocity, "Total", date, 0, calcStoryPoints);
    }
}

function processMonthlyData(velocity, teamName, date, bonusCalcStoryPoints, calcStoryPoints, sp_type) {
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
            months: Array.apply(null, {length: 12}).map(function(){return {total_sp:0, total_bonus_sp:0, dev_sp:0, qa_sp:0, sme_sp:0}})
        };
        yearObj.teams.push(teamObj);
    }

    teamObj.months[month].total_sp += calcStoryPoints;
    teamObj.months[month].total_bonus_sp += bonusCalcStoryPoints;

    if(sp_type == SP_TYPE.DEV){
        teamObj.months[month].dev_sp += bonusCalcStoryPoints;
    }
    else if(sp_type == SP_TYPE.QA){
        teamObj.months[month].qa_sp += bonusCalcStoryPoints;
    }else if(sp_type == SP_TYPE.SME){
        teamObj.months[month].sme_sp += bonusCalcStoryPoints;
    }
}
