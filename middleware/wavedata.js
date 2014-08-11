var mongoose = require('../libs/mongoose');

var Module = require('../models/module').Module;
var Page = require('../models/page').Page;
var log = require('../libs/log')(module);

var statusExport = require('../public/jsc/statusList');
var statusList = new statusExport.statuses();

exports.getData = function (req, res) {
    parsePages(function (err, wavedata) {
        if (err) throw err;
        res.json(wavedata);
    });
}

function waveData() {
    this.waves = [
        {
            moduleGroup: [
                {
                    module: [
                        {
                            cloudApp: [
                                {
                                    progress: 0,
                                    reportedSP: 0,
                                    summarySP: 0,
                                    name: "",
                                    uri: "",
                                    status: "",
                                    resolution: "",
                                    cancelled: false,
                                    blocked: false,
                                    accepted: false,
                                    readyForAcceptance: false,
                                    readyForQA: false,
                                    teamName: "",
                                    smeName: "",
                                    pages: 0
                                }
                            ],
                            reportedSP: 0,
                            summarySP: 0,
                            progress: 0,
                            name: "",
                            uri: ""
                        }
                    ],
                    reportedSP: 0,
                    summarySP: 0,
                    progress: 0,
                    name: "",
                    uri: ""
                }
            ],
            reportedSP: 0,
            summarySP: 0,
            progress: 0,
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

function isParentApp(labels) {
    return labels.indexOf("CloudApp_ParentPage") > -1;
}

function getCloudAppName(labels) {
    var indexpp = labels.indexOf("CloudApp_ParentPage");
    var index = labels.indexOf("CloudApp_");
    if(indexpp > -1 && indexpp == index) {
        index = labels.indexOf("CloudApp_", indexpp+1);
    }
    if(index < 0) {
        return "UnknownCloudApp";
    }
    var index2 = labels.indexOf(',', index);
    if(index2 < 0) {
        index2 = labels.length;
    }

    return labels.substring(index+9,index2);
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

function SortData(wavedata) {
    wavedata.waves.sort(function (a, b) {
        a = a.name;
        b = b.name;
        var v1 = parseInt(a.substring(4));
        var v2 = parseInt(b.substring(4));

        if(a == "UnknownWave") {
            return 1;
        }
        if(b == "UnknownWave") {
            return -1;
        }
        return v1 > v2 ? 1 : v1 < v2 ? -1 : 0;
    });

    for (var i = 0; i < wavedata.waves.length; i++) {
        wavedata.waves[i].moduleGroup.sort(function (a, b) {
            a = a.name;
            b = b.name;
            return a > b ? 1 : a < b ? -1 : 0;
        });
        for (var j = 0; j < wavedata.waves[i].moduleGroup.length; j++) {
            wavedata.waves[i].moduleGroup[j].module.sort(function (a, b) {
                a = a.name;
                b = b.name;
                return a > b ? 1 : a < b ? -1 : 0;
            });
            for (var k = 0; k < wavedata.waves[i].moduleGroup[j].module.length; k++) {
                wavedata.waves[i].moduleGroup[j].module[k].cloudApp.sort(function (a, b) {
                    a = a.name;
                    b = b.name;
                    return a > b ? 1 : a < b ? -1 : 0;
                });
            }
        }
    }
}
function parsePages(callback) {
    var wavedata = new waveData();
    wavedata.waves = [];

    Page.find({}).exec(function (err, pages) {
        for (var i = 0; i < pages.length; i++) {
            var page = pages[i];
            var storyPoints = page.storyPoints == null ? 0 : parseFloat(page.storyPoints);
            var moduleGroup = getModuleGroupName(page.labels);
            var moduleName = getModuleName(page.labels);
            var cloudApp = getCloudAppName(page.labels);
            var wave = getWaveName(page.labels);
            var teamName = getTeamName(page.labels);
            var progress = page.progress;
            var status = page.status;
            var resolution = page.resolution;
            var calcStoryPoints = storyPoints * progress / 100;
            var isParent = isParentApp(page.labels);
            var smeName = getSMEName(page.labels);

            putDataPoint(wavedata,
                wave, moduleGroup, moduleName, teamName, cloudApp, smeName,
                calcStoryPoints, storyPoints, status, resolution, isParent);
        }
        SortData(wavedata);
        callback(err, wavedata);
    })
}

function putDataPoint(wavedata,
                      wave, moduleGroup, moduleName, teamName, cloudApp, smeName,
                      calcStoryPoints, storyPoints, status, resolution, isParent) {
    var initUri = "https://jira.epam.com/jira/issues/?jql=project%20%3D%20PLEX-UXC%20and%20issuetype%3DStory%20AND%20%22Story%20Points%22%20%3E%200%20and%20labels%20in%20(";
    //wave

    var waved;
    for (var k = 0; k < wavedata.waves.length; k++) {
        if (wavedata.waves[k].name == wave) {
            waved = wavedata.waves[k];
            break;
        }
    }
    if(!waved) {
        waved = { moduleGroup: [], progress: 0, reportedSP: 0, summarySP: 0, name: wave };
        wavedata.waves.push(waved);
    }

    waved.reportedSP += calcStoryPoints;
    waved.summarySP += storyPoints;
    waved.progress = waved.reportedSP*100/waved.summarySP;
    waved.uri = initUri + wave + ")";

    //module group
    var moduleGroupd;
    for (var k = 0; k < waved.moduleGroup.length; k++) {
        if (waved.moduleGroup[k].name == moduleGroup) {
            moduleGroupd = waved.moduleGroup[k];
            break;
        }
    }
    if(!moduleGroupd) {
        moduleGroupd = { module: [], progress: 0, reportedSP: 0, summarySP: 0, name: moduleGroup};
        waved.moduleGroup.push(moduleGroupd);
    }

    moduleGroupd.reportedSP += calcStoryPoints;
    moduleGroupd.summarySP += storyPoints;
    moduleGroupd.progress = moduleGroupd.reportedSP*100/moduleGroupd.summarySP;
    moduleGroupd.uri = initUri + "PageModuleGroup_" + moduleGroup + ")";

    //module
    var moduled;
    for (var k = 0; k < moduleGroupd.module.length; k++) {
        if (moduleGroupd.module[k].name == moduleName) {
            moduled = moduleGroupd.module[k];
            break;
        }
    }
    if(!moduled) {
        moduled = { cloudApp: [], progress: 0, reportedSP: 0, summarySP: 0, name: moduleName};
        moduleGroupd.module.push(moduled);
    }

    moduled.reportedSP += calcStoryPoints;
    moduled.summarySP += storyPoints;
    moduled.progress = moduled.reportedSP*100/moduled.summarySP;
    moduled.uri = initUri + "PageModule_" + moduleName + ") AND labels in(PageModuleGroup_" + moduleGroup+ ")";

    //Cloud App
    var cloudAppd;
    for (var k = 0; k < moduled.cloudApp.length; k++) {
        if (moduled.cloudApp[k].name == cloudApp) {
            cloudAppd = moduled.cloudApp[k];
            break;
        }
    }
    status = status == 'Closed' && resolution == "Done" ? "Accepted" : status;
    status = status == 'Closed' && resolution != "Done" ? "Cancelled" : status;
    status = status == 'Reopened' ? "Assigned" : status;

    if(!cloudAppd) {
        cloudAppd = { progress: 0, reportedSP: 0, summarySP: 0, name: cloudApp,
            status: status,
            resolution: resolution,
            accepted: status == 'Accepted',
            cancelled: status == 'Cancelled',
            readyForAcceptance: status == 'Resolved',
            readyForQA: status == 'Ready for QA' || status == "Testing in Progress",
            blocked: status == 'Blocked',
            teamName: teamName,
            smeName: smeName,
            pages: 0
        };
        moduled.cloudApp.push(cloudAppd);
    }

    if(isParent) {
        cloudAppd.teamName = teamName;
        cloudAppd.smeName = smeName;
    }
    cloudAppd.reportedSP += calcStoryPoints;
    cloudAppd.summarySP += storyPoints;
    cloudAppd.progress = cloudAppd.reportedSP*100/cloudAppd.summarySP;
    cloudAppd.uri = initUri + "CloudApp_" + cloudApp + ") AND labels in(PageModuleGroup_" + moduleGroup + ") AND labels in(PageModule_" + moduleName + ") AND labels in(" + wave + ")";
    cloudAppd.pages++;


    var cloudAppStatus = statusList.getStatusByName(cloudAppd.status);
    var pageStatus = statusList.getStatusByName(status);

    if(pageStatus.weight < cloudAppStatus.weight){
        cloudAppd.status = status;
        cloudAppd.accepted = cloudAppd.status == 'Accepted';
        cloudAppd.cancelled = cloudAppd.status == 'Cancelled';
        cloudAppd.readyForAcceptance = cloudAppd.status == 'Resolved';
        cloudAppd.readyForQA = cloudAppd.status == 'Ready for QA' || cloudAppd.status == "Testing in Progress";
        cloudAppd.blocked = cloudAppd.status == 'Blocked';
    }
}
