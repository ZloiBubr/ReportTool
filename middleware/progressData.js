var mongoose = require('../libs/mongoose');
var progressModel = require('../models/progress').progress;
var Module = require('../models/module').Module;
var Page = require('../models/page').Page;
var log = require('../libs/log')(module);
var persons = require('./persons');

exports.getData = function (req, res) {
    parsePages(function (err, progress) {
        if (err) throw err;
        res.json(progress);
    });
}

function sortData(progress) {
    progress.dates.sort(function (a, b) {
        a = new Date(a.date);
        b = new Date(b.date);
        return a > b ? -1 : a < b ? 1 : 0;
    });
}

function getPrevMonday(d) {
    d = new Date(d);
    var day = d.getDay(),
        diff = d.getDate() - day + (day == 0 ? -6:1); // adjust when day is sunday
    return new Date(d.setDate(diff));
}

function parsePages(callback) {
    var progress = new progressModel();
    //1. grab all pages
    Page.find({}, function (err, pages) {
        progress.dates = [];
        for (var i = 0; i < pages.length; i++) {
            var page = pages[i];
            var storyPoints = parseInt(page.storyPoints) == null ? 0 : parseInt(page.storyPoints);
            var pageProgress = parseInt(page.progress) == null ? 0 : parseInt(page.progress) * storyPoints / 100;
            var teamName = getTeamName(page.labels);
            var key = page.key;

            //time spent
            var devTimeSpent = 0;
            var qaTimeSpent = 0;
            for (var j = 0; j < page.worklogHistory.length; j++) {
                var worklog = page.worklogHistory[j];
                var isDeveloper = persons.isDeveloper(worklog.person);
                if(isDeveloper) {
                    devTimeSpent += parseFloat(worklog.timeSpent);
                }
                else {
                    qaTimeSpent += parseFloat(worklog.timeSpent);
                }
            }

            //dev estimated time
            var totalhours =
                storyPoints == 3 ? 8 :
                storyPoints == 5 ? 16 :
                storyPoints == 13 ? 40 :
                storyPoints == 17 ? 60 :
                storyPoints == 21 ? 80 :
                storyPoints == 34 ? 120 :
                storyPoints == 55 ? 160 : 0;
            var estimated = parseInt(page.progress) > 0 ? devTimeSpent*100/parseInt(page.progress) : totalhours;
            var strestimated = Math.floor(estimated).toString() + 'h/' + totalhours.toString();

            var lastTwoWeeks = new Date(Date.now());
            lastTwoWeeks.setHours(0, 0, 0, 0);
            lastTwoWeeks.setDate(lastTwoWeeks.getDate()-7);
            lastTwoWeeks = getPrevMonday(lastTwoWeeks);

            for (var j = 0; j < page.progressHistory.length; j++) {
                var history = page.progressHistory[j];
                var date = new Date(Date.parse(history.dateChanged));
                date.setHours(12, 0, 0, 0);
                if(date < lastTwoWeeks) {
                    continue;
                }
                var person = history.person;
                var from = parseInt(history.progressFrom);
                if(from > 1) {
                    if(history.progressTo == '0' ||
                        history.progressTo == '1' ||
                        history.progressTo == '' ||
                        history.progressTo == null)
                    continue;
                }
                var to = history.progressTo == null || history.progressTo == '' ? 0 : parseInt(history.progressTo);
                var progressDiff = to - from;
                var calcStoryPoints = storyPoints * progressDiff / 100;
                var uri = page.uri;
                var blockers = page.blockers != null ? page.blockers.split("PLEXUXC") : [];
                var blockersnum = blockers.length > 0 ? blockers.length-1 : 0;

                putDataPoint(key, progress, teamName, date, calcStoryPoints, person, uri, devTimeSpent, qaTimeSpent, storyPoints, pageProgress, strestimated, blockersnum);
            }
        }

        //2. sort
        sortData(progress);

        callback(err, progress);
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

function putDataPoint(key, progress, teamName, date, calcStoryPoints, person, uri, devTimeSpent, qaTimeSpent, storyPoints, pageProgress, estimated, blockersnum) {
    var dateFound = false;
    for (var k = 0; k < progress.dates.length; k++) {
        var pdate = progress.dates[k];
        if ((pdate.date - date) == 0) {
            dateFound = true;
            var teamFound = false;
            for (var b = 0; b < pdate.teams.length; b++) {
                var team = pdate.teams[b];
                if (team.name == teamName) {
                    teamFound = true;
                    var pages = team.pages;
                    if (pages) {
                        for (var l = 0; l < pages.length; l++) {
                            var page = pages[l];
                            if (page.key == key) {
                                page.person = person;
                                page.progress = page.progress + calcStoryPoints;
                                page.devspent = devTimeSpent;
                                page.qaspent = qaTimeSpent;
                                page.sumprogress = pageProgress;
                                page.storypoints = storyPoints;
                                page.estimated = estimated;
                                page.blockersnum = blockersnum;
                                return;
                            }
                        }
                        pages.push({
                            key: key,
                            progress: calcStoryPoints,
                            person: person,
                            uri: uri,
                            devspent: devTimeSpent,
                            qaspent: qaTimeSpent,
                            sumprogress: pageProgress,
                            storypoints: storyPoints,
                            estimated: estimated,
                            blockersnum: blockersnum
                    });
                    }
                    else {
                        team.pages = [{
                                key: key,
                                progress: calcStoryPoints,
                                person: person,
                                uri: uri,
                                devspent: devTimeSpent,
                                qaspent: qaTimeSpent,
                                sumprogress: pageProgress,
                                storypoints: storyPoints,
                                estimated: estimated,
                                blockersnum: blockersnum
                            }];
                    }
                }
            }
            if (!teamFound) {
                pdate.teams.push({
                    name: teamName, pages: [{
                            key: key,
                            progress: calcStoryPoints,
                            person: person,
                            uri: uri,
                            devspent: devTimeSpent,
                            qaspent: qaTimeSpent,
                            sumprogress: pageProgress,
                            storypoints: storyPoints,
                            estimated: estimated,
                            blockersnum: blockersnum
                    }]
                });
            }
        }
    }
    if (!dateFound) {
        progress.dates.push({
            date: date, teams: [{
                    name: teamName, pages: [{
                        key: key,
                        progress: calcStoryPoints,
                        person: person,
                        uri: uri,
                        devspent: devTimeSpent,
                        qaspent: qaTimeSpent,
                        sumprogress: pageProgress,
                        storypoints: storyPoints,
                        estimated: estimated,
                        blockersnum: blockersnum
                    }]
                }]
        });
    }
}
