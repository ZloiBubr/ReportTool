var mongoose = require('../libs/mongoose');
var helpers = require('../middleware/helpers');

var Module = require('../models/module').Module;
var Page = require('../models/page').Page;
var log = require('../libs/log')(module);
var async = require('async');
var _ = require('underscore');

var statusExport = require('../public/jsc/Models/statusList');
var statusList = new statusExport.statuses();

exports.getData = function (req, res) {
    parsePages(function (cloudAppData) {
        res.json(cloudAppData);
    });
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
            callback(cloudappdata);
        }
    ]);
}

function putDataPoint(cloudAppData, module, page) {
    var initUri = "https://jira.epam.com/jira/issues/?jql=project%20%3D%20PLEX-UXC%20and%20issuetype%3DStory%20AND%20%22Story%20Points%22%20%3E%200%20and%20labels%20in%20(";

    var labels = module._doc.labels != null ? module._doc.labels : "";
    var teamName = helpers.getTeamName(labels);
    var streamName = helpers.getStreamName(labels);
    var smeName = module.assignee;
    var moduleGroupName = helpers.getModuleGroupName(page.labels);
    var cloudAppName = helpers.getCloudAppName(page.labels);
    var fixVersions = module.fixVersions;
    var moduleName = helpers.getModuleName(page.labels);
    var priority = module.priority;
    var dueDateConfirmed = helpers.getDueDateConfirmed(labels);


    var storyPoints = page.storyPoints == null ? 0 : parseFloat(page.storyPoints);
    var progress = page.progress == null ? 0 : parseInt(page.progress);
    if(progress == 1) {
        progress = 0;
    }
    var calcStoryPoints = storyPoints * progress / 100;

    var status = helpers.updateStatus(page.status, page.resolution);

    var cloudApp;
    for(var i=0; i<cloudAppData.cloudApp.length; i++) {
        if(cloudAppData.cloudApp[i].name == cloudAppName) {
            cloudApp = cloudAppData.cloudApp[i];
            cloudApp.reportedSP += calcStoryPoints;
            cloudApp.summarySP += storyPoints;
            cloudApp.progress = cloudApp.reportedSP*100/cloudApp.summarySP;
            cloudApp.pages++;

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
            uri: initUri + "CloudApp_" + cloudAppName + ") AND labels in(PageModuleGroup_" + moduleGroupName + ") AND labels in(PageModule_" + moduleName + ")"
        };
        cloudAppData.cloudApp.push(cloudApp);
    }
}
