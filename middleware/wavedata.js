var mongoose = require('../libs/mongoose');
var helpers = require('../middleware/helpers');

var Module = require('../models/module').Module;
var Page = require('../models/page').Page;
var log = require('../libs/log')(module);
var async = require('async');
var _ = require('underscore');
var cache = require('node_cache');
var statusExport = require('../public/jsc/Models/statusList');
var statusList = new statusExport.statuses();
var STATUS = require('../public/jsc/models/statusList').STATUS;

exports.getData = function (req, res) {

    cache.getData("waveData",function(setterCallback){
        parsePages(function (data) {
            setterCallback(data);
        });
    }, function(value){res.json(value);});
};

function cloudAppData() {
    this.cloudApp = [];
}

function parsePages(callback) {
    var cloudappdata = new cloudAppData();
    cloudappdata.cloudApp = [];

    async.series([
        function (callback) {
            Module.find({}).exec(function(err, modules) {
                async.series([
                        async.eachSeries(modules, function(module, callback) {
                                Page.find({epicKey: module.key}).exec(function (err, pages) {
                                    if(pages != null && pages.length > 0) {
                                        async.eachSeries(pages, function(page, callback) {
                                                if(helpers.isActive(page.status, page.resolution)) {
                                                    putDataPoint(cloudappdata, module, page);
                                                }
                                                callback();
                                            },
                                            function() {
                                                callback();
                                            });
                                    }
                                    else {
                                        callback();
                                    }
                                })
                            },
                            function() {
                                callback();
                            })
                    ],
                    function() {
                        callback();
                    });
            });
        },
        function () {
            cloudappdata.cloudApp.sort(function (a, b) {
                a = a.name;
                b = b.name;
                return a > b ? 1 : a < b ? -1 : 0;
            });
            updateChecklistsProgress(cloudappdata);
            callback(cloudappdata);
        }
    ]);
}

function updateChecklistsProgress(cloudappdata) {
    for(var i=0; i<cloudappdata.cloudApp.length; i++) {
        var item = cloudappdata.cloudApp[i];
        var created = 0;
        var total = 0;
        for(var j=0; j<item.checklistsProgress.length; j++) {
            if(item.checklistsProgress[j] == true) {
                created++;
            }
            total++;
        }
        cloudappdata.cloudApp[i].checklistsProgress = created*100 / total;
    }
}

function putDataPoint(cloudAppData, module, page) {
    var initUri = "https://jira.epam.com/jira/issues/?jql=project = PLEX-UXC and issuetype = Story and labels in (";

    if(!helpers.isActive(page.status, page.resolution)) {
        return;
    }

    var labels = module._doc.labels != null ? module._doc.labels : "";

    var teamName = helpers.getTeamName(page.labels);
    if(teamName == "" || teamName == "--") {
        var tname = helpers.getTeamName(labels);
        if(tname != "--") {
            teamName = tname;
        }
    }
    var streamName = helpers.getStreamName(page.labels);
    if(streamName == "" || streamName == "--") {
        var sname = helpers.getStreamName(labels);
        if(sname != "--") {
            streamName = sname;
        }
    }

    var smeName = module.assignee;
    var moduleGroupName = helpers.getModuleGroupName(page.labels);
    var cloudAppName = helpers.getCloudAppName(page.labels);
    var moduleName = module.summary;

    var priority = module.priority;
    var dueDateConfirmed = helpers.getDueDateConfirmed(labels);
    var isParentPage = helpers.isParentPage(page.labels);
    var fixVersions = module.fixVersions;

    var timeSpent = helpers.getTimeSpent(page);

    var storyPoints = page.storyPoints == null ? 0. : parseFloat(page.storyPoints);
    var progress = page.progress == null ? 0. : parseInt(page.progress);
    if(progress == 1.) {
        progress = 0.;
    }
    var calcStoryPoints = storyPoints * progress / 100.;

    if(page.status == "Production") {
        page.status = STATUS.PRODUCTION.name;
    }
    var status = helpers.updateStatus(page.status, page.resolution);
    var fullUri = initUri + "CloudApp_" + cloudAppName + ") AND 'Epic Link' = " + module.key;
    var cloudApp;
    for(var i=0; i<cloudAppData.cloudApp.length; i++) {
        if(cloudAppData.cloudApp[i].name == cloudAppName &&
        cloudAppData.cloudApp[i].moduleGroupName == moduleGroupName &&
        cloudAppData.cloudApp[i].moduleName == module.summary &&
        cloudAppData.cloudApp[i].fixVersions == fixVersions) {
            cloudApp = cloudAppData.cloudApp[i];
            cloudApp.reportedSP += calcStoryPoints;
            cloudApp.summarySP += storyPoints;
            if(storyPoints > 30) {
                cloudApp.xxl = true;
            }
            cloudApp.progress = cloudApp.reportedSP*100./cloudApp.summarySP;
            cloudApp.pages++;
            cloudApp.devTimeSpent += timeSpent.devTimeSpent;
            cloudApp.qaTimeSpent += timeSpent.qaTimeSpent;
            cloudApp.checklistsProgress.push(page.checklistCreated);
            cloudApp.teamName = teamName;
            cloudApp.streamName = streamName;
            if(isParentPage) {
                cloudApp.testingProgress = page.testingProgress;
            }

            var found = false;
            for(var j=0; j<cloudApp.assignees.length; j++) {
                if(cloudApp.assignees[j] == page.assignee) {
                    found = true;
                    break;
                }
            }
            if(!found) {
                cloudApp.assignees.push(page.assignee);
            }

            var cloudAppStatus = statusList.getStatusByName(cloudApp.status);
            var pageStatus = statusList.getStatusByName(status);

            if(pageStatus.weight < cloudAppStatus.weight){
                cloudApp.status = status;
            }
        }
    }

    if(!cloudApp) {
        cloudApp = {
            progress: progress,
            reportedSP: calcStoryPoints,
            summarySP: storyPoints,
            xxl: storyPoints > 30,
            name: cloudAppName,
            status: status,
            resolution: page.resolution,
            teamName: teamName,
            streamName: streamName,
            smeName: smeName,
            moduleGroupName: moduleGroupName,
            moduleName: moduleName,
            fixVersions: fixVersions,
            priority: priority,
            pages: 1,
            dueDateConfirmed: dueDateConfirmed,
            uri: fullUri,
            devTimeSpent: timeSpent.devTimeSpent,
            qaTimeSpent: timeSpent.qaTimeSpent,
            assignees: [smeName, page.assignee],
            testingProgress: isParentPage ? page.testingProgress : 0.,
            checklistsProgress: [page.checklistCreated]
        };
        cloudAppData.cloudApp.push(cloudApp);
    }
}
