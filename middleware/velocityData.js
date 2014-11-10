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

function getCleanModuleName(moduleName) {
    var index = moduleName.indexOf("Module");
    if(index < 0) {
        return moduleName;
    }

    return moduleName.substring(0,index-1);
}

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
                var modulesAdded = [];
                async.series([
                        async.eachSeries(modules, function(module, callback) {
                                Page.find({epicKey: module.key}).exec(function (err, pages) {
                                    if(pages != null && pages.length > 0) {
                                        async.eachSeries(pages, function(page, callback) {
                                                var storyPoints = page.storyPoints == null ? 0 : parseFloat(page.storyPoints);
                                                var status = page.status;
                                                var resolution = page.resolution;
                                                var ignore = status == "Closed" && (resolution == "Out of Scope" || resolution == "Rejected" || resolution == "Canceled");

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

                                                    putDataPoint(velocity, "Actual burn", date, calcStoryPoints, "");
                                                }
                                                if(module.duedate != null) {
                                                    if(!ignore) {
                                                        maximumBurn += storyPoints;
                                                    }
                                                    var date = new Date(Date.parse(module.duedate));
                                                    date.setHours(12, 0, 0, 0);
                                                    date = date.getTime();
                                                    var tooltip = "";
                                                    if(modulesAdded.indexOf(module.summary) < 0) {
                                                        tooltip = getCleanModuleName(module.summary);
                                                        modulesAdded.push(module.summary);
                                                    }
                                                    putDataPoint(velocity, "Planned burn", date, storyPoints, tooltip);
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
            burn.data[l + 1].y += burn.data[l].y;
        }
    }
    //4. round
    for (var k = 0; k < velocity.data.length; k++) {
        var burn = velocity.data[k];
        for (var l = 0; l < burn.data.length; l++) {
            burn.data[l].y = Math.round(maximumBurn - burn.data[l].y);
        }
    }

}

function SortData(velocity) {
    for (var k = 0; k < velocity.data.length; k++) {
        var burn = velocity.data[k];
        burn.data.sort(function (a, b) {
            a = new Date(a.x);
            b = new Date(b.x);
            return a > b ? 1 : a < b ? -1 : 0;
        });
    }
}

function putDataPoint(velocity, burnName, date, calcStoryPoints, tooltip) {
    for (var k = 0; k < velocity.data.length; k++) {
        var burn = velocity.data[k];
        if (burn.name == burnName) {
            var found = false;
            for (var l = 0; l < burn.data.length; l++) {
                var burnData = burn.data[l];
                if ((burnData.x - date) == 0) {
                    found = true;
                    burnData.y += calcStoryPoints;
                    if(burn.name == "Planned burn") {
                        burnData.tooltip += tooltip == "" ? "" : "," + tooltip;
                    }
                    return;
                }
            }
            if (!found) {
                burn.data.push({x: date, y: calcStoryPoints, tooltip: tooltip});
                return;
            }
        }
    }
}
