var mongoose = require('../libs/mongoose');

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
    this.module = [
                    {
                        key: "",
                        reportedSP: 0,
                        summarySP: 0,
                        progress: 0,
                        teamnames: [],
                        smename: "",
                        duedate: Date.parse("1/1/1970"),
                        accepted: false,
                        status: "",
                        modulestatus: "",
                        moduleresolution: "",
                        name: "",
                        moduleGroup: "",
                        pagescount: 0,
                        endOfYearDelivery: false,
                        q1Delivery: false,
                        dueDateConfirmed: false,
                        uri: ""
                    }
                ];
}

function getTeamName(labels) {
    var index = labels.indexOf("Team");
    if(index < 0) {
        return "";
    }
    var index2 = labels.indexOf(',', index);
    if(index2 < 0) {
        index2 = labels.length;
    }

    return labels.substring(index+4,index2);
}

function getDueDateConfirmed(labels) {
    var index = labels.indexOf("DueDateConfirmed");
    if(index < 0) {
        return false;
    }
    return true;
}

function getStreamName(labels) {
    var index = labels.indexOf("Stream");
    if(index < 0) {
        return "";
    }
    var index2 = labels.indexOf(',', index);
    if(index2 < 0) {
        index2 = labels.length;
    }

    return labels.substring(index+6,index2);
}

function getModuleGroupName(labels) {
    var groupName = "Unknown Module Group";
    var index = labels.indexOf("PageModuleGroup_");
    if(index < 0) {
        return groupName;
    }
    var index2 = labels.indexOf(',', index);
    if(index2 < 0) {
        index2 = labels.length;
    }

    if(labels.substring(index+16,index2) != "") {
        groupName = labels.substring(index+16,index2);
    }
    return groupName;
}

function getSizeName(labels) {
    var sizeName = "Unknown";
    var index = labels.indexOf("PageSize");
    if(index < 0) {
        return sizeName;
    }
    var index2 = labels.indexOf(',', index);
    if(index2 < 0) {
        index2 = labels.length;
    }

    if(labels.substring(index+8,index2) != "") {
        sizeName = labels.substring(index+8,index2);
    }
    return sizeName;
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

    var pageByMonthArray = [[],[],[],[],[],[],[],[],[],[],[],[]];

    async.series([
        function (callback) {
            Module.find({}).exec(function(err, modules) {
                async.series([
                    async.eachSeries(modules, function(module, callback) {
                            var endOfYearDelivery = module._doc.labels != null ? module._doc.labels.indexOf('EOYDeliverable') > -1 : false;
                            var q1Delivery = module._doc.labels != null ? module._doc.labels.indexOf('Q1Deliverable') > -1 : false;
                            var q2Delivery = module._doc.labels != null ? module._doc.labels.indexOf('Q2Deliverable') > -1 : false;
                            var q2Delivery = q2Delivery || !(endOfYearDelivery || q1Delivery);
                            var dueDateConfirmed = getDueDateConfirmed(module._doc.labels);
                            var count = 0;
                            var labels = module._doc.labels != null ? module._doc.labels : "";
                            var teamName = getTeamName(labels);
                            var streamName = getStreamName(labels);

                            Page.find({epicKey: module.key}).exec(function (err, pages) {
                            if(pages != null && pages.length > 0) {
                                async.eachSeries(pages, function(page, callback) {
                                        var storyPoints = page.storyPoints == null ? 0 : parseFloat(page.storyPoints);

                                        if(page.devFinished != null) {
                                            var dfDate = new Date(Date.parse(page.devFinished));
                                            var dfMonth = dfDate.getMonth();
                                            var sizeName = getSizeName(page.labels);
                                            var monthItems = pageByMonthArray[dfMonth];
                                            if(monthItems[sizeName] != null) {
                                                monthItems[sizeName]++;
                                            }
                                            else {
                                                monthItems[sizeName] = 1;
                                            }
                                        }

                                        //if(page.epicKey == 'PLEXUXC-2056') {
                                        //    log.info(page.key + ', ' + page.status + ', ' + page.resolution);
                                        //}

                                        var moduleGroup = getModuleGroupName(page.labels);

                                        var calcStoryPoints = storyPoints * page.progress / 100;

                                        var status = page.status;
                                        var resolution = page.resolution;

                                        status = status == 'Closed' && resolution == "Done" ? "Accepted" : status;
                                        status = status == 'Closed' && resolution == "Implemented" ? "Accepted" : status;

                                        var ignore = status == "Closed" && (resolution == "Out of Scope" || resolution == "Rejected" || resolution == "Canceled");

                                        if(!ignore) {
                                            putDataPoint(moduledata, endOfYearDelivery, q1Delivery, q2Delivery, dueDateConfirmed, status, moduleGroup, teamName, streamName, calcStoryPoints, storyPoints, ++count, module);
                                        }
                                        callback();
                                },
                                function(err) {
                                    callback();
                                });
                            }
                            else {
                                putDataPoint(moduledata, endOfYearDelivery, q1Delivery, q2Delivery, dueDateConfirmed, "Empty", "Unknown Module Group", teamName, streamName, 0, 0, count, module);
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

function putDataPoint(moduledata, endOfYearDelivery, q1Delivery, q2Delivery, dueDateConfirmed, status, moduleGroup, teamName, streamName, calcStoryPoints, storyPoints, count, module) {
    var initUri = "https://jira.epam.com/jira/issues/?jql=project%20%3D%20PLEX-UXC%20and%20issuetype%3DEpic%20AND%20summary%20~%20'";

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
            fixVersions: module.fixVersions
        };
        moduledata.module.push(moduled);
    }

    moduled.reportedSP += calcStoryPoints;
    moduled.summarySP += storyPoints;
    moduled.progress = moduled.reportedSP*100/moduled.summarySP;
    moduled.uri = initUri + module.summary + "'";
    moduled.moduleGroup = moduleGroup;
    moduled.accepted = moduled.accepted ? status == "Accepted" : false;
    moduled.pagescount = count;
    moduled.endOfYearDelivery = endOfYearDelivery;
    moduled.q1Delivery = q1Delivery;
    moduled.q2Delivery = q2Delivery;
    moduled.dueDateConfirmed = dueDateConfirmed;


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
        var foundt = false;
        _.each(moduled.teamnames, function (teamname) {
            if (teamname == teamName) {
                foundt = true;
            }
        });

        if (!foundt) {
            moduled.teamnames.push(teamName);
        }
    }
}

