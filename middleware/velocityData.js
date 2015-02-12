var mongoose = require('../libs/mongoose');
var Module = require('../models/module').Module;
var Page = require('../models/page').Page;
var log = require('../libs/log')(module);
var async = require('async');
var _ = require('underscore');
var cache = require('node_cache');
var helpers = require('../middleware/helpers');
var STATUS = require('../public/jsc/models/statusList').STATUS;

exports.getData = function (req, res) {

    cache.getData("velocityData",function(setterCallback){
        parsePages(function (data) {
            setterCallback(data);
        });
    }, function(value){res.json(value);});
};


function distribution (){
    this.data =  [
                {
                    name: STATUS.PMREVIEW.name,
                    data: [0,0]
                },
                {
                    name: STATUS.LAREADY.name,
                    data: [0,0]
                },
                {
                    name: STATUS.PRODUCTION.name,
                    data: [0,0]
                },
                {
                    name: STATUS.CLOSED.name,
                    data: [0,0]
                },
                {
                    name: STATUS.RESOLVED.name,
                    data: [0,0]
                },
                {
                    name: STATUS.TESTINGINPROGRESS.name,
                    data: [0,0]
                },
                {
                    name: STATUS.READYFORQA.name,
                    data: [0,0]
                },
                {
                    name: STATUS.CODEREVIEW.name,
                    data: [0,0]
                },
                {
                    name: STATUS.REOPENED.name,
                    data: [0,0]
                },
                {
                    name: STATUS.BLOCKED.name,
                    data: [0,0]
                },
                {
                    name: STATUS.INPROGRESS.name,
                    data: [0,0]
                },
                {
                    name: STATUS.ASSIGNED.name,
                    data: [0,0]
                },
                {
                    name: STATUS.OPEN.name,
                    data: [0,0]
                },
                {
                    name: STATUS.DEFERRED.name,
                    data: [0,0]
                }
            ];
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
        },
        {
            data: [],
            name: "Projected burn"
        },
        {
            data: [],
            name: "Planned burn core",
            visible: false
        },
        {
            data: [],
            name: "Actual burn core",
            visible: false
        },
        {
            data: [],
            name: "Projected burn core",
            visible: false
        }],
        
        distribution: new distribution(),
        distributionByTeam: {}
    };

    var maximumBurn = 0.0;
    var maximumBurnCore = 0.0;
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
                                                var ignore = !helpers.isActive(status, resolution);

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
                                                    if(module.fixVersions != "8.0 Final") {
                                                        putDataPoint(velocity, "Actual burn core", date, calcStoryPoints, "");
                                                    }
                                                }
                                                if(module.duedate != null) {
                                                    if(!ignore) {
                                                        maximumBurn += storyPoints;
                                                        var date = new Date(Date.parse(module.duedate));
                                                        date.setHours(12, 0, 0, 0);
                                                        date = date.getTime();
                                                        var tooltip = "";
                                                        if(modulesAdded.indexOf(module.summary) < 0) {
                                                            tooltip = module.summary;
                                                            modulesAdded.push(module.summary);
                                                        }
                                                        putDataPoint(velocity, "Planned burn", date, storyPoints, tooltip);
                                                        if(module.fixVersions != "8.0 Final") {
                                                            maximumBurnCore += storyPoints;
                                                            putDataPoint(velocity, "Planned burn core", date, storyPoints, tooltip);
                                                        }
                                                    }
                                                }
                                                if(!ignore) {
                                                    addStackedData(velocity, status, storyPoints, helpers.getTeamName(page.labels));
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
            putDataPoint(velocity, "Planned burn core", date, 0.0);
            SortData(velocity);
            AddProjection(true, maximumBurn, velocity);
            AddProjection(false, maximumBurnCore, velocity);
            SumData(true, maximumBurn, velocity);
            SumData(false, maximumBurnCore, velocity);
            AdjustProjection(true, velocity);
            AdjustProjection(false, velocity);
            callback(velocity);
        }
    ]);
}

function AdjustProjection(isCore, velocity) {
    var lastValue = 0.0;
    var actualName = isCore ? "Actual burn" : "Actual burn core";
    var projectedName = isCore ? "Projected burn" : "Projected burn core";

    for (var k = 0; k < velocity.data.length; k++) {
        var burn = velocity.data[k];
        if (burn.name == actualName) {
            lastValue = burn.data.length > 0 ? burn.data[burn.data.length-1].y : lastValue;
            break;
        }
    }

    for (var k = 0; k < velocity.data.length; k++) {
        var burn = velocity.data[k];
        if(burn.name == projectedName) {
            for (var l = 0; l < burn.data.length-1; l++) {
                var delta = burn.data[l].y - burn.data[l+1].y;
                if(l==0) {
                    burn.data[l].y = Math.floor(lastValue);
                }
                else if(l == burn.data.length-2) {
                    burn.data[l].y = Math.floor(burn.data[l-1].y - delta);
                    burn.data[l+1].y = Math.floor(burn.data[l].y - delta);
                }
                else {
                    burn.data[l].y = Math.floor(burn.data[l-1].y - delta);
                }
            }
            var negativeIndex = burn.data.length;
            for (var l = 0; l < burn.data.length; l++) {
                if(burn.data[l].y < 0.) {
                    negativeIndex = l;
                    break;
                }
            }
            if(negativeIndex < burn.data.length) {
                burn.data = burn.data.slice(0, negativeIndex + 1);
            }
            break;
        }
    }
}

function AddProjection(isCore, maximumBurn, velocity) {
    var actualName = isCore ? "Actual burn" : "Actual burn core";
    var projectedName = isCore ? "Projected burn" : "Projected burn core";
    var monthAgo = new Date(Date.now());
    monthAgo.setMonth(monthAgo.getMonth()-3);
    var monthAgoMsc = monthAgo.getTime();
    var sum = 0.0;
    var projectedBurn = null;

    for (var k = 0; k < velocity.data.length; k++) {
        var burn = velocity.data[k];
        if(burn.name == actualName) {
            for (var l = 0; l < burn.data.length; l++) {
                if(burn.data[l].x > monthAgoMsc) {
                    sum += burn.data[l].y;
                }
            }
        }
        if(burn.name == projectedName) {
            projectedBurn = burn;
        }
    }

    var projectEnd = new Date(2015,8,1);
    var pointDate = new Date(Date.now());
    var pointValue = maximumBurn;
    projectedBurn.dashStyle = "ShortDash";
    while(pointDate < projectEnd) {
        var pointDateMsc = pointDate.getTime();
        projectedBurn.data.push({x:pointDateMsc, y:pointValue, tooltip: ""});
        pointValue -= sum/3.;
        pointDate.setMonth(pointDate.getMonth()+1);
    }
}

function SumData(isCore, maximumBurn, velocity) {
    var burnsList = isCore ? ["Planned burn", "Actual burn"] : ["Planned burn core", "Actual burn core"];
    for (var k = 0; k < velocity.data.length; k++) {
        var burn = velocity.data[k];
        if(burn.name != burnsList[0] && burn.name != burnsList[1]) {
            continue;
        }
        for (var l = 0; l < burn.data.length - 1; l++) {
            burn.data[l + 1].y += burn.data[l].y;
        }
    }
    for (var k = 0; k < velocity.data.length; k++) {
        var burn = velocity.data[k];
        if(burn.name != burnsList[0] && burn.name != burnsList[1]) {
            continue;
        }
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

function addStackedData(velocity, status, storyPoints, teamName) {
    var added = false;

    var team = velocity.distributionByTeam[teamName == "--"? "NoTeam" : teamName] = velocity.distributionByTeam[teamName == "--"? "NoTeam" : teamName] || {distribution: new distribution()};

    for(var i=0; i<velocity.distribution.data.length; i++) {
        if (velocity.distribution.data[i].name == status) {
            velocity.distribution.data[i].data[0]++;
            velocity.distribution.data[i].data[1] += storyPoints || 0;

            team.distribution.data[i].data[0]++;
            team.distribution.data[i].data[1] += storyPoints || 0;

            added = true;
            break;
        }
    }

    if(!added) {
        log.info(status + ':' + storyPoints);
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
                    if(burn.name == "Planned burn" || burn.name == "Planned burn core") {
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
