var mongoose = require('../libs/mongoose');
var helpers = require('../middleware/helpers');

var Module = require('../models/module').Module;
var Page = require('../models/page').Page;
var log = require('../libs/log')(module);
var async = require('async');
var _ = require('underscore');
var statusExport = require('../public/jsc/models/statusList');
var statusList = new statusExport.statuses();

exports.getData = function (req, res) {
    parsePages(function (moduledata) {
        res.json(moduledata);
    });
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
                            var labels = module._doc.labels != null ? module._doc.labels : "";
                            var dueDateConfirmed = helpers.getDueDateConfirmed(labels);
                            var count = 0;
                            var teamName = helpers.getTeamName(labels);
                            var streamName = helpers.getStreamName(labels);

                            Page.find({epicKey: module.key}).exec(function (err, pages) {
                            if(pages != null && pages.length > 0) {
                                async.eachSeries(pages, function(page, callback) {
                                        var storyPoints = page.storyPoints == null ? 0 : parseFloat(page.storyPoints);
                                        var moduleGroup = helpers.getModuleGroupName(page.labels);
                                        var progress = page.progress == null ? 0 : parseInt(page.progress);
                                        var calcStoryPoints = storyPoints * progress / 100;
                                        var status = helpers.updateStatus(page.status, page.resolution);

                                        if(helpers.isActive(page.status, page.resolution)) {
                                            putDataPoint(moduledata, dueDateConfirmed, status, moduleGroup, teamName, streamName, calcStoryPoints, storyPoints, ++count, module);
                                        }
                                        callback();
                                },
                                function(err) {
                                    callback();
                                });
                            }
                            else {
                                putDataPoint(moduledata, dueDateConfirmed, "Empty", "Unknown Module Group", teamName, streamName, 0, 0, count, module);
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
            callback(moduledata);
        }
    ]);
}

function putDataPoint(moduledata, dueDateConfirmed, status, moduleGroup, teamName, streamName, calcStoryPoints, storyPoints, count, module) {
    var initUri = "https://jira.epam.com/jira/browse/";
    var blocked = status == "Blocked";
    var deferred = status == "Deferred";

    //module
    var moduled;
    for (var k = 0; k < moduledata.module.length; k++) {
        if (moduledata.module[k].key == module.key) {
            moduled = moduledata.module[k];
            break;
        }
    }
    if(!moduled) {
        moduled = { progress: 0, reportedSP: 0, summarySP: 0,
            name: module.summary, duedate: module.duedate, smename: module.assignee,
            teamnames: [], key: module.key,
            accepted: status == "Accepted", status: status,
            modulestatus: module.status, moduleresolution: module.resolution,
            fixVersions: module.fixVersions, blocked: blocked, deferred: deferred
        };
        moduledata.module.push(moduled);
    }

    moduled.reportedSP += calcStoryPoints;
    moduled.summarySP += storyPoints;
    moduled.progress = moduled.reportedSP*100/moduled.summarySP;
    moduled.uri = initUri + module.key;
    moduled.moduleGroup = moduleGroup;
    moduled.accepted = moduled.accepted ? status == "Accepted" : false;
    moduled.pagescount = count;
    moduled.dueDateConfirmed = dueDateConfirmed;
    moduled.blocked |= blocked;
    moduled.deferred |= deferred;
    moduled.priority = module.priority;


    var moduleStatus = statusList.getStatusByName(moduled.status);
    var newStatus = statusList.getStatusByName(status);

    if(newStatus.weight < moduleStatus.weight){
        moduled.status = status;
    }
    if(teamName != "") {
        var stream = streamName == "" ? "" : ":" + streamName;
        putTeamName(teamName + stream, moduled);
    }
}

function putTeamName(teamName, moduled) {
    if (teamName != "") {
        var found = false;
        _.each(moduled.teamnames, function (teamname) {
            if (teamname == teamName) {
                found = true;
            }
        });

        if (!found) {
            moduled.teamnames.push(teamName);
        }
    }
}

