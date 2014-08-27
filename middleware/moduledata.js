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
                                        var storyPoints = page.storyPoints == null ? 0 : parseFloat(page.storyPoints);

                                        var moduleGroup = getModuleGroupName(page.labels);
                                        var teamName = getTeamName(page.labels);

                                        var calcStoryPoints = storyPoints * page.progress / 100;

                                        var status = page.status;
                                        var resolution = page.resolution;
                                        var endOfYearDelivery = module._doc.labels != null ? module._doc.labels.indexOf('EOYDeliverable') > -1 ? true : false : false;

                                        if(!(status == "Closed" && (resolution == "Out of Scope" || resolution == "Duplicate"))) {
                                            status = status == 'Closed' && resolution == "Done" ? "Accepted" : status;

                                            putDataPoint(moduledata, endOfYearDelivery, status, moduleGroup, teamName, calcStoryPoints, storyPoints, ++count, module);
                                        }
                                        callback();
                                },
                                function(err) {
                                    callback();
                                });
                            }
                            else {
                                putDataPoint(moduledata, false, "Empty", "Unknown Module Group", "", 0, 0, count, module);
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

function putDataPoint(moduledata, endOfYearDelivery, status, moduleGroup, teamName, calcStoryPoints, storyPoints, count, module) {
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
            modulestatus: module.status, moduleresolution: module.resolution };
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


    var moduleStatus = statusList.getStatusByName(moduled.status);
    var newStatus = statusList.getStatusByName(status);

    if(newStatus.weight < moduleStatus.weight){
        moduled.status = status;
    }

    if(teamName != "") {
        var foundt = false;
        _.each(moduled.teamnames, function(teamname) {
            if(teamname == teamName) {
                foundt = true;
            }
        });

        if(!foundt) {
            moduled.teamnames.push(teamName);
        }
    }
}
