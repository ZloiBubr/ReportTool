var mongoose = require('../libs/mongoose');
var helpers = require('../middleware/helpers');
var STATUS = require('../public/jsc/models/statusList').STATUS;
var RESOLUTION = require('../public/jsc/models/statusList').RESOLUTION;

var Module = require('../models/module').Module;
var Page = require('../models/page').Page;
var log = require('../libs/log')(module);
var async = require('async');
var cache = require('node_cache');
var _ = require('underscore');
var statusExport = require('../public/jsc/models/statusList');
var statusList = new statusExport.statuses();

exports.getData = function (req, res) {
    cache.getData("moduleData",function(setterCallback){
        parsePages(function (data) {
            setterCallback(data);
        });
    }, function(value){res.json(value);});
};

function moduleData() {
    this.module = [];
}

function SortData(moduledata) {
    moduledata.module.sort(function (a, b) {
        a = a.name;
        b = b.name;
        return a > b ? 1 : a < b ? -1 : 0;
    });
}

function parsePages(callback) {
    var moduledata = new moduleData();
    moduledata.module = [];

    async.series([
        function (callback) {
            Module.find({}).exec(function(err, modules) {
                async.series([
                    async.eachSeries(modules, function(module, callback) {
                            var count = 0;
                            Page.find({epicKey: module.key}).exec(function (err, pages) {
                            if(pages != null && pages.length > 0) {
                                async.eachSeries(pages, function(page, callback) {
                                        if(helpers.isActive(page.status, page.resolution)) {
                                            putDataPoint(moduledata, module, page, ++count);
                                        }
                                        callback();
                                },
                                function(err) {
                                    callback();
                                });
                            }
                            else {
                                putDataPoint(moduledata, module, null, count);
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
            SortData(moduledata);
            updateChecklistsProgress(moduledata);
            callback(moduledata);
        }
    ]);
}

function updateChecklistsProgress(moduledata) {
    for(var i=0; i<moduledata.module.length; i++) {
        var created = 0;
        var total = 0;
        var item = moduledata.module[i];
        for(var j=0; j<item.checklistsProgress.length; j++) {
            if(item.checklistsProgress[j] == true) {
                created++;
            }
            total++;
        }
        item.checklistsProgress = total > 0 ? created*100 / total : 0;

        var progress = 0.;
        for(var k=0; k<item.testingProgress.length; k++) {
            progress += item.testingProgress[k];
        }
        item.testingProgress = item.testingProgress.length > 0 ? progress / item.testingProgress.length : 0.;
    }
}

function putDataPoint(moduledata, module, page, count) {
    var labels = module._doc.labels ? module._doc.labels : "";
    var teamName = helpers.getTeamName(labels);
    var streamName = helpers.getStreamName(labels);
    var storyPoints, moduleGroup, progress, calcStoryPoints;
    var isParentPage = page ? helpers.isParentPage(page.labels) : false;
    if(page) {
        storyPoints = page.storyPoints == null ? 0. : parseFloat(page.storyPoints);
        moduleGroup = helpers.getModuleGroupName(page.labels);
        progress = page.progress == null ? 0. : parseInt(page.progress);
        calcStoryPoints = storyPoints * progress / 100.;
        var teamNameP = helpers.getTeamName(page.labels);
        if(teamNameP != "" && teamNameP != "--") {
            teamName = teamNameP;
        }
    }
    else {
        storyPoints = 0.;
        calcStoryPoints = 0.;
        moduleGroup = "Unknown Module Group";
    }

    var initUri = "https://jira.epam.com/jira/browse/";

    //module
    var moduled;
    for (var k = 0; k < moduledata.module.length; k++) {
        if (moduledata.module[k].key == module.key && moduledata.module[k].teamName == teamName) {
            moduled = moduledata.module[k];
            break;
        }
    }
    if(!moduled) {
        moduled = {
            key: module.key,
            name: module.summary,
            duedate: module.duedate,
            smename: module.assignee,
            moduleGroup: moduleGroup,
            moduleStatus: module.status,
            moduleResolution: module.resolution,
            status: page ? helpers.updateStatus(page) : STATUS.CANCELED.name,
            uri: initUri + module.key,
            fixVersions: module.fixVersions,
            dueDateConfirmed: helpers.getDueDateConfirmed(labels),
            priority: module.priority,
            progress: 0.,
            reportedSP: 0.,
            summarySP: 0.,
            xxl: false,
            teamName: teamName,
            streamName: streamName,
            testingProgress: [],
            checklistsProgress: [],
            cloudApps: [],
            devFinishDate: module.devfinish,
            qaFinishDate: module.qafinish,
            acceptanceFinishDate: module.accfinish,
            customerCompleteDate: module.cusfinish,
            acceptanceStatus: []
        };
        moduledata.module.push(moduled);
    }

    moduled.reportedSP += calcStoryPoints;
    moduled.summarySP += storyPoints;
    if(storyPoints > 30) {
        moduled.xxl = true;
    }
    moduled.progress = moduled.summarySP > 0. ? moduled.reportedSP*100/moduled.summarySP : 0.;
    moduled.pagescount = count;

    if(page) {
        moduled.hasblockers |= page.status == STATUS.BLOCKED.name | false;
        moduled.hasdeferred |= page.status == STATUS.DEFERRED.name | false;

        var moduleStatus = statusList.getStatusByName(moduled.status);
        var newStatus = statusList.getStatusByName(helpers.updateStatus(page));

        if(newStatus.weight < moduleStatus.weight){
            moduled.status = newStatus.name;
        }
        if(isParentPage) {
            moduled.testingProgress.push(page.testingProgress ? parseFloat(page.testingProgress) : 0.);
            moduled.acceptanceStatus.push(page.acceptanceStatus);
        }
        moduled.checklistsProgress.push(page.checklistCreated);
        addCloudApp(moduled, page);
    }
}

function addCloudApp(module, page) {
    var found = false;
    var status = page.status;
    if(status == "Production") {
        status = STATUS.PRODUCTION.name;
    }

    var cloudAppName = helpers.getCloudAppName(page.labels);
    for(var i=0; i<module.cloudApps.length; i++) {
        if(module.cloudApps[i].name == cloudAppName) {
            found = true;
            break;
        }
    }
    if(!found) {
        var cloudApp = {
            name: cloudAppName,
            cloudAppStatus: status
        };
        module.cloudApps.push(cloudApp);
    }
    if(helpers.isParentPage(page.labels)) {
        var cloudApp = module.cloudApps[module.cloudApps.length-1];
        cloudApp.devFinishDate = page.devfinish;
        cloudApp.qaFinishDate = page.qafinish;
        cloudApp.acceptanceFinishDate = page.accfinish;
        cloudApp.customerCompleteDate = page.cusfinish;
        cloudApp.acceptanceStatus = page.acceptanceStatus;
        cloudApp.cloudAppStatus = status;
    }
}