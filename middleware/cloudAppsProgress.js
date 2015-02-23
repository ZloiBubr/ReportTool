/**
 * Created by Mikita_Stalpinski on 10/6/2014.
 */
var Page = require("../models/page").Page;
var Issue = require('../models/issue').Issue;
var jiraTextUtility = require("./Utility/JiraTextUtility");
var STATUS = require('../public/jsc/models/statusList').STATUS;
var _ = require('underscore');
var async = require('async');
var cache = require('node_cache');

exports.getData = function (req, res) {
    var teamName = _.isEmpty(req.query.team) ? undefined : req.query.team;
    var cloudAppName = _.isEmpty(req.query.cloudApp) ? undefined : req.query.cloudApp;

    //var teamName = req.params.team;
    //var cloudAppName = req.params.cloudApp;
    cache.getData("pagebysizeData_" + teamName,function(setterCallback){
        parsePages(teamName, cloudAppName, function (err, data) {
            if (err) throw err;
            setterCallback(data);
        });
    }, function(value){res.json(value);});
}

function cloudAppData() {
    this.modules = [
        {
            moduleName: "",
            cloudApps: [
                {
                    appName: "",
                    stream: "",
                    pages: [
                        {
                            assignee: "",
                            readyPercent: "",
                            progress: "",
                            pageName: "",
                            storyPoints: 0,
                            team: "",
                            stream: "",
                            taskStatus: "",
                            checklistStatus: "",
                            blockers: [
                                {
                                    key: "",
                                    uri: "",
                                    status: "",
                                    pagesInvolved: 0
                                }
                            ]
                        }
                    ]
                }
            ]
        }
    ]
}

function parsePages(teamToSearch, cloudAppToSearch, callback) {
    var cloudAppsData = new cloudAppData();
    cloudAppsData.modules = [];

    var query = {};
    if (teamToSearch) {
        query.labels = new RegExp(teamToSearch.indexOf("Team") == 0 ? teamToSearch : "Team" + teamToSearch);
    }

    Page.find(query, { worklogHistory: 0, progressHistory: 0 })
        .exec(function (err, pages) {
            if (err) {
                callback(err);
            }

            async.eachLimit(pages, 10, function (page, callback) {
                    (function (page) {
                        if (cloudAppToSearch && jiraTextUtility.getCloudAppName(page.labels) != cloudAppToSearch) {
                            callback();
                            return;
                        }

                        Issue.find({ "pages.page": page._id }, function (err, issues) {
                            if (err) {
                                callback(err);
                            }

                            var moduleName = jiraTextUtility.getModuleName(page.labels);
                            var cloudAppName = jiraTextUtility.getCloudAppName(page.labels);
                            var assignee = getShortName(page.assignee);
                            var pageKey = page.key;
                            var progress = page.progress;
                            var shortPageName = page.summary.split("\\").pop();
                            var storyPoints = page.storyPoints;
                            var team = jiraTextUtility.getTeamName(page.labels);
                            var streamName = jiraTextUtility.getStreamName(page.labels);
                            var pageStatus = page.status;
                            var checklistStatus = page.checklistCreated;

                            var blockers = [];
                            for (var i = 0, issuesLength = issues.length; i < issuesLength; i++) {
                                var pageIssue = issues[i];
                                blockers.push({
                                    key: pageIssue.key,
                                    uri: pageIssue.uri,
                                    status: pageIssue.status,
                                    pagesInvolved: pageIssue.pages.length,
                                    type: pageIssue.type,
                                    isF5Issue: pageIssue.labels.indexOf("F5") > -1
                                })
                            }

                            putDataPoint(cloudAppsData, moduleName, cloudAppName, pageKey, assignee, progress, shortPageName, storyPoints, team, streamName, pageStatus, checklistStatus, blockers);

                            callback();
                        })
                    }(page))

                },
                function (err) {

                    var time = process.hrtime();
                    var filteredResult = {modules:[]};


                    _.each(cloudAppsData.modules, function(moduleItem){
                        var module = undefined;

                        _.each(moduleItem.cloudApps,function(cloudItem){

                            if(cloudItem.appName == "PartOperation"){
                                console.log(cloudItem.appName);
                            }

                            var count = _.filter(cloudItem.pages,function(pageItem){
                                return pageItem.taskStatus == STATUS.CLOSED.name;}
                            ).length;

                                if(count != cloudItem.pages.length) {
                                if(!module){
                                    module = {moduleName: moduleItem.moduleName, cloudApps: []};
                                    filteredResult.modules.push(module);
                                }
                                module.cloudApps.push(cloudItem)
                            }
                        })
                    });

                    var diff = process.hrtime(time);
                    console.log('benchmark took %d nanoseconds', diff[0] * 1e9 + diff[1]);


                    callback(err, filteredResult);
                }
            );
        });
}

function getShortName(name){
    if(name) {
        var del_index = name.indexOf(" ");
        return name[0] + ". " + name.substring(del_index + 1);
    }

    return name;
}

function putDataPoint(cloudAppsData, moduleName, appName, pageKey, assignee, progress, pageName, sp, team, stream, taskStatus, checklistStatus, blockers) {
    var module = _.find(cloudAppsData.modules, function (moduleItem) {
        return moduleItem.moduleName == moduleName;
    });

    if (_.isUndefined(module)) {
        module = {
            moduleName: moduleName,
            cloudApps: []
        };

        cloudAppsData.modules.push(module);
    }

    var cloudApp = _.find(module.cloudApps, function (cloudAppItem) {
        return cloudAppItem.appName == appName;
    });

    if (_.isUndefined(cloudApp)) {
        cloudApp = {
            appName: appName,
            stream: stream,
            pages: []
        };

        module.cloudApps.push(cloudApp);
    }

    var pageItem = {
        assignee: assignee,
        pageKey: pageKey,
        progress: progress,
        pageName: pageName,
        storyPoints: sp,
        team: team,
        stream: stream,
        taskStatus: taskStatus,
        checklistStatus: checklistStatus,
        blockers: blockers
    };

    cloudApp.pages.push(pageItem);
}