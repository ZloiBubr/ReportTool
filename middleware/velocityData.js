var mongoose = require('../libs/mongoose');
var Module = require('../models/module').Module;
var Page = require('../models/page').Page;
var log = require('../libs/log')(module);
var async = require('async');
var _ = require('underscore');

exports.getData = function (req, res) {
    parsePages(function (velocity) {
        res.json(velocity);
    });
};

function parsePages(callback) {
    var velocity = {
        data: [
        {
            data: [],
            name: "Planned burn"
        },
        {
            data: [],
            name: "Actual burn"
        }]
    };
    var maximumBurn = 0.0;
    async.series([
        function (callback) {
            Module.find({}).exec(function(err, modules) {
                async.series([
                        async.eachSeries(modules, function(module, callback) {
                                Page.find({epicKey: module.key}).exec(function (err, pages) {
                                    if(pages != null && pages.length > 0) {
                                        async.eachSeries(pages, function(page, callback) {
                                                var storyPoints = page.storyPoints == null ? 0 : parseFloat(page.storyPoints);
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
                                                    var status = page.status;
                                                    var resolution = page.resolution;

                                                    status = status == 'Closed' && resolution == "Done" ? "Accepted" : status;
                                                    status = status == 'Closed' && resolution == "Implemented" ? "Accepted" : status;

                                                    var ignore = status == "Closed" && (resolution == "Out of Scope" || resolution == "Rejected" || resolution == "Canceled");

                                                    if(!ignore) {
                                                        putDataPoint(velocity, "Actual burn", date, calcStoryPoints);
                                                    }
                                                }
                                                if(module.duedate != null) {
                                                    maximumBurn += storyPoints;
                                                    var date = new Date(Date.parse(module.duedate));
                                                    date.setHours(12, 0, 0, 0);
                                                    date = date.getTime();
                                                    putDataPoint(velocity, "Planned burn", date, storyPoints);
                                                }
                                                callback();
                                            },
                                            function(err) {
                                                callback();
                                            }
                                        );
                                    }
                                    else {
                                        callback();
                                    }
                                })
                            },
                            function(err) {
                                callback();
                            })
                    ],
                    function(err) {
                        callback();
                    });
            });
        },
        function () {
            var date = new Date("January 1, 2014 00:00:00");
            date = date.getTime();
            putDataPoint(velocity, "Planned burn", date, 0.0);
            SortData(velocity);
            SumData(maximumBurn, velocity);
            callback(velocity);
        }
    ]);
}

function SumData(maximumBurn, velocity) {
    for (var k = 0; k < velocity.data.length; k++) {
        var burn = velocity.data[k];
        for (var l = 0; l < burn.data.length - 1; l++) {
            var teamData1 = burn.data[l];
            var teamDataPoints = teamData1[1];
            var teamData2 = burn.data[l + 1];
            var teamDataPoints2 = teamData2[1];

            teamData2[1] = teamDataPoints + teamDataPoints2;
        }
    }
    //4. round
    for (var k = 0; k < velocity.data.length; k++) {
        var burn = velocity.data[k];
        for (var l = 0; l < burn.data.length; l++) {
            burn.data[l][1] = Math.round(maximumBurn - burn.data[l][1]);
        }
    }

}

function SortData(velocity) {
    for (var k = 0; k < velocity.data.length; k++) {
        var burn = velocity.data[k];
        burn.data.sort(function (a, b) {
            a = new Date(a[0]);
            b = new Date(b[0]);
            return a > b ? 1 : a < b ? -1 : 0;
        });
    }
}

function putDataPoint(velocity, burnName, date, calcStoryPoints) {
    for (var k = 0; k < velocity.data.length; k++) {
        var burn = velocity.data[k];
        if (burn.name == burnName) {
            var found = false;
            for (var l = 0; l < burn.data.length; l++) {
                var burnData = burn.data[l];
                var burnDataDate = burnData[0];
                var burnDataPoints = burnData[1];
                if ((burnDataDate - date) == 0) {
                    found = true;
                    burnData[1] = burnDataPoints + calcStoryPoints;
                    return;
                }
            }
            if (!found) {
                burn.data.push([date, calcStoryPoints]);
                return;
            }
        }
    }
}
