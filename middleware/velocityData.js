var mongoose = require('../libs/mongoose');

var Module = require('../models/module').Module;
var Page = require('../models/page').Page;
var SizeChange = require('../models/sizeChange').SizeChange;

var log = require('../libs/log')(module);
var async = require('async');
var _ = require('underscore');
var cache = require('node_cache');
var helpers = require('../middleware/helpers');
var STATUS = require('../public/jsc/models/statusList').STATUS;

var statusExport = require('../public/jsc/Models/statusList');
var versionHelper  = new statusExport.VersionHelper();

exports.getData = function (req, res) {

    cache.getData("velocityData",function(setterCallback){
        parsePages(function (data) {
            setterCallback(data);
        });
    }, function(value){res.json(value);});
};


function Distribution (){
    this.data =  [
                {
                    name: STATUS.LAREADY.name,
                    data: [0,0]
                },
                {
                    name: STATUS.PMREVIEW.name,
                    data: [0,0]
                },
                {
                    name: STATUS.PRODUCTION.name,
                    data: [0,0]
                },
                {
                    name: STATUS.ACCEPTED.name,
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
    var cloudAppsMap = {};

    var velocity = {
        data: [
        {
            data: [],
            name: "Planned burn core"        },
        {
            data: [],
            name: "Actual burn core"
        },
        {
            data: [],
            name: "Projected burn core"
        }],
        
        distribution: new Distribution()
    };

    var maximumBurnCore = 0.0;
    async.series([
        function (callback) {
            SizeChange.find({}).exec(function(err, sizeChanges) {
                velocity.sizeChanges = sizeChanges;
                velocity.sizeChanges.sort(function (a, b) {
                    a = new Date(a.date);
                    b = new Date(b.date);
                    return a < b ? 1 : a > b ? -1 : 0;
                });

                callback();
            });
        },
        function (callback) {
            Module.find({}).exec(function(err, modules) {
                var modulesAdded = [];
                async.series([
                        async.eachSeries(modules, function(module, callback) {
                                if(!versionHelper.isCoreVersion(module.fixVersions)) {
                                    callback();
                                    return;
                                }
                                Page.find({epicKey: module.key}).exec(function (err, pages) {
                                    if(pages != null && pages.length > 0) {
                                        async.eachSeries(pages, function(page, callback) {
                                                if(page.automationType || !helpers.isActive(page.status, page.resolution)) {
                                                    callback();
                                                    return;
                                                }
                                                var storyPoints = page.storyPoints != null ? parseFloat(page.storyPoints) : 0.;
                                                var progress = page.progress != null ? parseFloat(page.progress) : 0.;
                                                var calcStoryPoints = storyPoints * progress / 100;
                                                maximumBurnCore += storyPoints;

                                                var status = helpers.updateStatus(page);

                                                var lastTime = (new Date(2014,1,1)).getTime();
                                                for (var j = 0; j < page.progressHistory.length; j++) {
                                                    var date = new Date(Date.parse(page.progressHistory[j].dateChanged))
                                                    date.setHours(12, 0, 0, 0);
                                                    var time = date.getTime();
                                                    if(lastTime < time) {
                                                        lastTime = time;
                                                    }
                                                }
                                                putDataPoint(velocity, "Actual burn core", lastTime, calcStoryPoints, "");
                                                if(module.duedate != null) {
                                                    var dueDate = new Date(Date.parse(module.duedate));
                                                    dueDate.setHours(12, 0, 0, 0);
                                                    var dueTime = dueDate.getTime();
                                                    var tooltip = "";
                                                    if(modulesAdded.indexOf(module.summary) < 0) {
                                                        tooltip = module.summary;
                                                        modulesAdded.push(module.summary);
                                                    }
                                                    putDataPoint(velocity, "Planned burn core", dueTime, storyPoints, tooltip);
                                                }
                                                addStackedData(cloudAppsMap, page, status, storyPoints);
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
                                });
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
            var time = date.getTime();
            putDataPoint(velocity, "Planned burn core", time, 0.0);
            SortData(velocity);
            AddProjection(maximumBurnCore, velocity);
            SumData(maximumBurnCore, velocity);
            AdjustProjection(velocity);
            AddPageStatuses(cloudAppsMap, velocity);
            callback(velocity);
        }
    ]);
}

function AdjustProjection(velocity) {
    var lastValue = 0.0;
    var actualName = "Actual burn core";
    var projectedName = "Projected burn core";

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

function AddProjection(maximumBurn, velocity) {
    var actualName = "Actual burn core";
    var projectedName = "Projected burn core";
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
        projectedBurn.data.push({x:pointDateMsc, y:pointValue});
        pointValue -= sum/3.;
        pointDate.setMonth(pointDate.getMonth()+1);
    }
}

function SumData(maximumBurn, velocity) {
    var burnsList = ["Planned burn core", "Actual burn core"];
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

function AddPageStatuses(cloudAppsMap, velocity) {
    _.each(Object.keys(cloudAppsMap), function (key) {
        var cloudAppItem = cloudAppsMap[key];
        for (var i = 0; i < velocity.distribution.data.length; i++) {
            if (velocity.distribution.data[i].name == cloudAppItem.status) {
                velocity.distribution.data[i].data[0] += cloudAppItem.pages.length;
                velocity.distribution.data[i].data[1] += cloudAppItem.storyPoints;
                break;
            }
        }
    });
}

function addStackedData(cloudAppsMap, page, status, storyPoints) {
    var cloudAppName = helpers.getCloudAppName(page.labels);
    var moduleKey = page.epicKey;
    var cloudAppItem = cloudAppsMap[cloudAppName+moduleKey];
    if(!cloudAppItem) {
        cloudAppItem = { pages: [], status: status, storyPoints: 0};
        cloudAppsMap[cloudAppName+moduleKey] = cloudAppItem;
    }

    cloudAppItem.pages.push(page.key);
    cloudAppItem.storyPoints += storyPoints;

    if(helpers.isParentPage(page.labels)) {
        cloudAppItem.status = status;
    }
}

function putDataPoint(velocity, burnName, date, calcStoryPoints, tooltip) {
    var plannedName = "Planned burn core";
    for (var k = 0; k < velocity.data.length; k++) {
        var burn = velocity.data[k];
        if (burn.name == burnName) {
            var found = false;
            for (var l = 0; l < burn.data.length; l++) {
                var burnData = burn.data[l];
                if ((burnData.x - date) == 0) {
                    found = true;
                    burnData.y += calcStoryPoints;
                    if(burn.name == plannedName) {
                        burnData.tooltip += tooltip == "" ? "" : "," + tooltip;
                    }
                    return;
                }
            }
            if (!found) {
                var newPoint = burn.name == plannedName ? {x: date, y: calcStoryPoints, tooltip: tooltip} : {x: date, y: calcStoryPoints};
                burn.data.push(newPoint);
                return;
            }
        }
    }
}
