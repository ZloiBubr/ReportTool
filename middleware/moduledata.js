var mongoose = require('../libs/mongoose');

var Module = require('../models/module').Module;
var Page = require('../models/page').Page;
var log = require('../libs/log')(module);
var async = require('async');
var _ = require('underscore');

var epicDueDateMap = {};

exports.getData = function (req, res) {
    parsePages(function (moduledata) {
        res.json(moduledata);
    });
}

function moduleData() {
    this.wave = [
        {
            moduleGroup: [
                {
                    module: [
                        {
                            key: "",
                            reportedSP: 0,
                            summarySP: 0,
                            progress: 0,
                            teamnames: [],
                            smenames: [],
                            duedate: Date.parse("1/1/1970"),
                            name: "",
                            uri: ""
                        }
                    ],
                    reportedSP: 0,
                    summarySP: 0,
                    progress: 0,
                    duedate: Date.parse("1/1/1970"),
                    name: "",
                    uri: ""
                }
            ],
            reportedSP: 0,
            summarySP: 0,
            progress: 0,
            duedate: Date.parse("1/1/1970"),
            name: "",
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

function getSMEName(labels) {
    var index = labels.indexOf("SME_");
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
    var index = labels.indexOf("PageModuleGroup_");
    if(index < 0) {
        return "UnknownModuleGroup";
    }
    var index2 = labels.indexOf(',', index);
    if(index2 < 0) {
        index2 = labels.length;
    }

    return labels.substring(index+16,index2);
}

function getModuleName(labels) {
    var index = labels.indexOf("PageModule_");
    if(index < 0) {
        return "UnknownModule";
    }
    var index2 = labels.indexOf(',', index);
    if(index2 < 0) {
        index2 = labels.length;
    }

    return labels.substring(index+11,index2);
}

function getWaveName(labels) {
    var index = labels.indexOf("Wave");
    if(index < 0) {
        return "UnknownWave";
    }
    var index2 = labels.indexOf(',', index);
    if(index2 < 0) {
        index2 = labels.length;
    }

    return labels.substring(index,index2);
}

function SortData(moduledata) {
    moduledata.wave.sort(function (a, b) {
        a = a.name;
        b = b.name;
        var v1 = parseInt(a.substring(4));
        var v2 = parseInt(b.substring(4));
        return v1 > v2 ? 1 : v1 < v2 ? -1 : 0;
    });

    _.each(moduledata.wave, function(wave) {
        wave.moduleGroup.sort(function (a, b) {
            a = a.name;
            b = b.name;
            return a > b ? 1 : a < b ? -1 : 0;
        });
    });

    _.each(moduledata.wave, function(wave) {
        _.each(wave.moduleGroup, function(group) {
            group.module.sort(function (a, b) {
                a = a.name;
                b = b.name;
                return a > b ? 1 : a < b ? -1 : 0;
            });
        });
    });
}

function parsePages(callback) {
    var moduledata = new moduleData();
    moduledata.wave = [];

    epicDueDateMap = {};
    async.series([
        function (callback3) {
            Module.find({}).exec(function(err, modules) {
                async.each(modules, function(module, callback2) {
                    epicDueDateMap[module.key] = module.duedate == null ? new Date("1/1/1970") : module.duedate;
                    callback2();
                },
                function(err) {
                    callback3();
                })
            });
        },
        function (callback3) {
            Page.find({}).exec(function (err, pages) {
                async.each(pages, function(page, callback2) {
                    var storyPoints = page.storyPoints == null ? 0 : parseFloat(page.storyPoints);
                    var moduleGroup = getModuleGroupName(page.labels);
                    var moduleName = getModuleName(page.labels);
                    var teamName = getTeamName(page.labels);
                    var progress = page.progress;
                    var calcStoryPoints = storyPoints * progress / 100;
                    var smeName = getSMEName(page.labels);
                    var duedate = epicDueDateMap[page.epicKey];
                    var wave = getWaveName(page.labels);
                    putDataPoint(moduledata, wave,
                        moduleGroup, moduleName, teamName, smeName,
                        calcStoryPoints, storyPoints, duedate, page.epicKey);
                    callback2();
                });
                callback3();
            })
        },
        function(err) {
            SortData(moduledata);
            callback(moduledata);
        }
    ]);
}

function putDataPoint(moduledata, wave,
                      moduleGroup, moduleName, teamName, smeName,
                      calcStoryPoints, storyPoints, duedate, moduleKey) {
    var initUri = "https://jira.epam.com/jira/issues/?jql=project%20%3D%20PLEX-UXC%20and%20issuetype%3DStory%20AND%20%22Story%20Points%22%20%3E%200%20and%20labels%20in%20(";

    //wave

    var waved;
    for (var k = 0; k < moduledata.wave.length; k++) {
        if (moduledata.wave[k].name == wave) {
            waved = moduledata.wave[k];
            break;
        }
    }
    if(!waved) {
        waved = { moduleGroup: [], progress: 0, reportedSP: 0, summarySP: 0, name: wave, duedate: duedate };
        moduledata.wave.push(waved);
    }

    waved.reportedSP += calcStoryPoints;
    waved.summarySP += storyPoints;
    waved.progress = waved.reportedSP*100/waved.summarySP;
    waved.uri = initUri + wave + ")";
    if(waved.duedate < duedate) {
        waved.duedate = duedate;
    }

    //module group
    var moduleGroupd;
    for (var k = 0; k < waved.moduleGroup.length; k++) {
        if (waved.moduleGroup[k].name == moduleGroup) {
            moduleGroupd = waved.moduleGroup[k];
            break;
        }
    }
    if(!moduleGroupd) {
        moduleGroupd = { module: [], progress: 0, reportedSP: 0, summarySP: 0, name: moduleGroup, duedate: duedate};
        waved.moduleGroup.push(moduleGroupd);
    }

    moduleGroupd.reportedSP += calcStoryPoints;
    moduleGroupd.summarySP += storyPoints;
    moduleGroupd.progress = moduleGroupd.reportedSP*100/moduleGroupd.summarySP;
    moduleGroupd.uri = initUri + "PageModuleGroup_" + moduleGroup + ")";
    if(moduleGroupd.duedate < duedate) {
        moduleGroupd.duedate = duedate;
    }

    //module
    var moduled;
    for (var k = 0; k < moduleGroupd.module.length; k++) {
        if (moduleGroupd.module[k].name == moduleName) {
            moduled = moduleGroupd.module[k];
            break;
        }
    }
    if(!moduled) {
        moduled = { progress: 0, reportedSP: 0, summarySP: 0,
            name: moduleName, duedate: duedate, smenames: [], teamnames: [], key: moduleKey };
        moduleGroupd.module.push(moduled);
    }

    moduled.reportedSP += calcStoryPoints;
    moduled.summarySP += storyPoints;
    moduled.progress = moduled.reportedSP*100/moduled.summarySP;
    moduled.uri = initUri + "PageModule_" + moduleName + ") AND labels in(PageModuleGroup_" + moduleGroup + ") AND labels in(" + wave + ")";

    if(smeName != "") {
        var found = false;
        _.each(moduled.smenames, function(smename) {
            if(smename == smeName) {
                found = true;
            }
        });

        if(!found) {
            moduled.smenames.push(smeName);
        }
    }

    if(teamName != "") {
        var found = false;
        _.each(moduled.teamnames, function(teamname) {
            if(teamname == teamName) {
                found = true;
            }
        });

        if(!found) {
            moduled.teamnames.push(teamName);
        }
    }
}
