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
                                    name: ""
                                }
                            ],
                            progress: 0,
                            name: ""
                        }
                    ],
                    progress: 0,
                    name: ""
                }
            ],
            progress: 0,
            name: ""
        }
    ];
}

function getModuleGroupName(labels) {
    var index = labels.indexOf("PageModuleGroup");
    if(index < 0) {
        return "UnknownModuleGroup";
    }
    var index2 = labels.indexOf(',', index);
    if(index2 < 0) {
        index2 = labels.length;
    }

    return labels.substring(index+1,index2);
}

function getModuleName(labels) {
    var index = labels.indexOf("PageModule");
    if(index < 0) {
        return "UnknownModule";
    }
    var index2 = labels.indexOf(',', index);
    if(index2 < 0) {
        index2 = labels.length;
    }

    return labels.substring(index+1,index2);
}

function getCloudAppName(labels) {
    var index = labels.indexOf("CloudApp");
    if(index < 0) {
        return "UnknownCloudApp";
    }
    var index2 = labels.indexOf(',', index);
    if(index2 < 0) {
        index2 = labels.length;
    }

    return labels.substring(index,index2);
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
    var found = false;
    for (var k = 0; k < wavedata.waves.length; k++) {
        var waved = wavedata.waves[k];
        if (waved.name == wave) {
            found = true;
        }
    }
}
