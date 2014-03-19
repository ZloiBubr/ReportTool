var mongoose = require('../libs/mongoose');
var progressModel = require('../models/progress').progress;
var Module = require('../models/module').Module;
var Page = require('../models/page').Page;
var async = require('async');
var log = require('../libs/log')(module);
var progress = new progressModel();

exports.getData = function() {
    if(progress.dates.length == 1) {
        parsePages(function(err) {
            if(err) throw err;
            return progress;
        });
    }
    else {
        return progress;
    }
}

function sortData(progress) {
    progress.dates.sort(function (a, b) {
        a = new Date(a.date);
        b = new Date(b.date);
        return a > b ? 1 : a < b ? -1 : 0;
    });
}

function parsePages(callback) {
    //1. grab all pages
    Page.find({}).exec(function (err, pages) {
        progress.dates = [];
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
                var progressDiff = to - from;
                var calcStoryPoints = storyPoints * progressDiff / 100;
                putDataPoint(key, progress, teamName, date, calcStoryPoints);
            }
        }

        //2. sort
        sortData(progress);

        callback(err);
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

function putDataPoint(key, progress, teamName, date, calcStoryPoints){
    for(var k=0; k<progress.dates.length; k++) {
        var pdate = progress.dates[k];
        if((pdate.date - date) == 0) {
            switch (teamName) {
                case "TeamRenaissance": {
                        var pages = pdate.values.teamRenaissancePages;
                        if(pages) {
                            for(var l=0; l< pages.length; l++) {
                                var page = pages[l];
                                if(page.key == key) {
                                    page.progress += calcStoryPoints;
                                    return;
                                }
                            }
                            pages.push([{key: key, progress: calcStoryPoints}]);
                        }
                        else {
                            pdate.values.teamRenaissancePages = [{key: key, progress: calcStoryPoints}];
                        }
                        return;
                    }
                case "TeamInspiration": {
                        var pages = pdate.values.teamInspirationPages;
                        if(pages) {
                            for(var l=0; l< pages.length; l++) {
                                var page = pages[l];
                                if(page.key == key) {
                                    page.progress += calcStoryPoints;
                                    return;
                                }
                            }
                            pages.push([{key: key, progress: calcStoryPoints}]);
                        }
                        else {
                            pdate.values.teamInspirationPages = [{key: key, progress: calcStoryPoints}];
                        }
                        return;
                    }
                case "TeamNova": {
                        var pages = pdate.values.teamNovaPages;
                        if(pages) {
                            for(var l=0; l< pages.length; l++) {
                                var page = pages[l];
                                if(page.key == key) {
                                    page.progress += calcStoryPoints;
                                    return;
                                }
                            }
                            pages.push([{key: key, progress: calcStoryPoints}]);
                        }
                        else {
                            pdate.values.teamNovaPages = [{key: key, progress: calcStoryPoints}];
                        }
                        return;
                    }
            }
        }
    }
    switch (teamName) {
        case "TeamRenaissance": {
            progress.dates.push( {date: date, values: {teamRenaissancePages: [{key: key, progress: calcStoryPoints}]}} );
            break;
        }
        case "TeamInspiration": {
            progress.dates.push( {date: date, values: {teamInspirationPages: [{key: key, progress: calcStoryPoints}]}} );
            break;
        }
        case "TeamNova": {
            progress.dates.push( {date: date, values: {teamNovaPages: [{key: key, progress: calcStoryPoints}]}} );
            break;
        }
    }
}
