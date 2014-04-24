var mongoose = require('../libs/mongoose');
var Module = require('../models/module').Module;
var Page = require('../models/page').Page;
var log = require('../libs/log')(module);
var AllTeams = require ('../public/jsc/allteams').AllTeams;

exports.getData = function (req, res) {
    parsePages(function (err, personaldata) {
        if (err) throw err;
        res.json(personaldata);
    });
}

function parsePages(callback) {
    var personaldata = AllTeams;

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
                var from = history.progressFrom == null || history.progressFrom == '' ? 0 : parseInt(history.progressFrom);
                var to = history.progressTo == null || history.progressTo == '' ? 0 : parseInt(history.progressTo);
                progress += to - from;
            }
            var calcStoryPoints = storyPoints * progress / 100;

            putDataPoint(wavedata, wave, moduleGroup, moduleName, cloudApp, calcStoryPoints, storyPoints);
        }
        SortData(wavedata);
        callback(err, wavedata);
    })
}

function putDataPoint(wavedata, wave, moduleGroup, moduleName, cloudApp, calcStoryPoints, storyPoints) {
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
        waved = { moduleGroup: [], progress: 0, reportedSP: 0, summarySP: 0, name: wave};
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
    if(!cloudAppd) {
        cloudAppd = { progress: 0, reportedSP: 0, summarySP: 0, name: cloudApp};
        moduled.cloudApp.push(cloudAppd);
    }

    cloudAppd.reportedSP += calcStoryPoints;
    cloudAppd.summarySP += storyPoints;
    cloudAppd.progress = cloudAppd.reportedSP*100/cloudAppd.summarySP;
    cloudAppd.uri = initUri + "CloudApp_" + cloudApp + ") AND labels in(PageModuleGroup_" + moduleGroup + ") AND labels in(PageModule_" + moduleName + ")";
}
