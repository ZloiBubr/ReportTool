var mongoose = require('../libs/mongoose');
var Module = require('../models/module').Module;
var Page = require('../models/page').Page;
var log = require('../libs/log')(module);

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
                                    name: ""
                                }
                            ],
                            reportedSP: 0,
                            summarySP: 0,
                            progress: 0,
                            name: ""
                        }
                    ],
                    reportedSP: 0,
                    summarySP: 0,
                    progress: 0,
                    name: ""
                }
            ],
            reportedSP: 0,
            summarySP: 0,
            progress: 0,
            name: ""
        }
    ];
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

function getCloudAppName(labels) {
    var index = labels.indexOf("CloudApp_");
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
            var progress = 0;

            for (var j = 0; j < page.progressHistory.length; j++) {
                var history = page.progressHistory[j];
                var to = history.progressTo == null || history.progressTo == '' ? 0 : parseInt(history.progressTo);
                progress = to > progress ? to : progress;
            }
            var calcStoryPoints = storyPoints * progress / 100;

            putDataPoint(wavedata, wave, moduleGroup, moduleName, cloudApp, calcStoryPoints, storyPoints);
        }

        callback(err, wavedata);
    })
}

function putDataPoint(wavedata, wave, moduleGroup, moduleName, cloudApp, calcStoryPoints, storyPoints) {
    //wave
    var waved;
    for (var k = 0; k < wavedata.waves.length; k++) {
        if (wavedata.waves[k].name == wave) {
            waved = wavedata.waves[k];
            break;
        }
    }
    if(!waved) {
        waved = { moduleGroup: [], progress: 0, reportedSP: 0, summarySP: 0, name: wave};
        wavedata.waves.push(waved);
    }

    waved.reportedSP += calcStoryPoints;
    waved.summarySP += storyPoints;
    waved.progress = waved.reportedSP*100/waved.summarySP;

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

    //Cloud App
    var cloudAppd;
    for (var k = 0; k < moduled.cloudApp.length; k++) {
        if (moduled.cloudApp[k].name == cloudApp) {
            cloudAppd = moduled.cloudApp[k];
            break;
        }
    }
    if(!cloudAppd) {
        cloudAppd = { progress: 0, reportedSP: 0, summarySP: 0, name: cloudApp};
        moduled.cloudApp.push(cloudAppd);
    }

    cloudAppd.reportedSP += calcStoryPoints;
    cloudAppd.summarySP += storyPoints;
    cloudAppd.progress = cloudAppd.reportedSP*100/cloudAppd.summarySP;
}
