var mongoose = require('../libs/mongoose');
var velocity = require('../models/velocity').data;
var Module = require('../models/module').Module;
var Page = require('../models/page').Page;
var async = require('async');
var data = new velocity();
var log = require('../libs/log')(module);

parsePages(data);

exports.getData = function() {
    return data;
}

function parsePages(data) {
//1. grab all pages
    Page.find({}).exec(function (err, pages) {
        for (var i = 0; i < pages.length; i++) {
            var page = pages[i];
            var storyPoints = parseInt(page.storyPoints) == null ? 0 : parseInt(page.storyPoints);
            var teamName = getTeamName(page.labels);
            var key = page.key;
            for (var j = 0; j < page.progressHistory.length; j++) {
                var history = page.progressHistory[j];
                var date = new Date(Date.parse(history.dateChanged));
                date.setHours(12,0,0,0);
                //date = date.getTime();
                var from = parseInt(history.progressFrom);
                var to = history.progressTo == null || history.progressTo == '' ? 0 : parseInt(history.progressTo);
                var progress = to - from;
                var calcStoryPoints = storyPoints * progress / 100;
                putDataPoint(key, data, teamName, date, calcStoryPoints);
            }
        }

        //2. sort
        for(var k=0; k<data.data.length; k++) {
            var team = data.data[k];
            team.data.sort(function(a, b) {
                a = new Date(a.date);
                b = new Date(b.date);
                return a>b ? 1 : a<b ? -1 : 0;
            });
        }
        //3. summ
/*        for(var k=0; k<data.data.length; k++) {
            var team = data.data[k];
            for(var l=0; l<team.data.length-1; l++) {
                var teamData1 = team.data[l];
                var teamDataDate = teamData1[0];
                var teamDataPoints = teamData1[1];
                var teamData2 = team.data[l+1];
                var teamDataDate2 = teamData2[0];
                var teamDataPoints2 = teamData2[1];

                teamData2[1] = teamDataPoints + teamDataPoints2;
            }
        } */
    })
}

function getTeamName(labels) {
    if(labels.indexOf("TeamRenaissance") > -1)
        return "TeamRenaissance";
    if(labels.indexOf("TeamInspiration") > -1)
        return "TeamInspiration";
    if(labels.indexOf("TeamNova") > -1)
        return "TeamNova";
}

function putDataPoint(key, data, teamName, date, calcStoryPoints){
    for(var k=0; k<data.data.length; k++) {
        var team = data.data[k];
        if(team.name == teamName) {
            var found = false;
            for(var l=0; l<team.data.length; l++) {
                var teamData = team.data[l];
                if((teamData.date - date) == 0 && teamData.key == key) {
                    found = true;
                    teamData.progress = teamData.progress + calcStoryPoints;
                    return;
                }
            }
            if(!found) {
                team.data.push({date: date, progress: calcStoryPoints, key: key});
                return;
            }
        }
    }
}
