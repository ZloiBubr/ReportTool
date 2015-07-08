var mongoose = require('../libs/mongoose');
var Module = require('../models/module').Module;
var Page = require('../models/page').Page;
var log = require('../libs/log')(module);
var helpers = require('../middleware/helpers');
var statusExport = require('../public/jsc/Models/statusList');
var statusList = new statusExport.Statuses();
var async = require('async');
var _ = require('underscore');
var cache = require('node_cache');

exports.getData = function (req, res) {

    cache.getData("normalizedData",function(setterCallback){
        parsePages(function (data) {
            setterCallback(data);
        });
    }, function(value){res.json(value);});

};

function CloudAppData() {
    this.cloudApp = [];
}

function ChartData() {
    this.data = [];
}

function parsePages(callback) {
    var cloudappdata = new CloudAppData();
    var chartdata = new ChartData();

    async.series([
        function (callback) {
            Module.find({}).exec(function(err, modules) {
                async.series([
                    function (callback) {
                        async.eachSeries(modules, function(module, callback) {
                                Page.find({epicKey: module.key}).exec(function (err, pages) {
                                    if(pages != null && pages.length > 0) {
                                        async.eachSeries(pages, function(page, callback) {
                                                putDataPoint(cloudappdata, module, page);
                                                callback();
                                            },
                                            function() {
                                                callback();
                                            });
                                    }
                                    else {
                                        callback();
                                    }
                                });
                            },
                            function() {
                                callback();
                            })
                    }
                ],
                function() {
                    callback();
                });
            });
        },
        function () {
            copyCloudAppData(chartdata, cloudappdata);
            sortChartData(chartdata);
            callback(chartdata);
        }
    ]);
}

function sortChartData(chartdata) {
    _.each(chartdata.data, function(dataLine) {
        dataLine.data.sort(function (a, b) {
            var aa = new Date(a.x);
            var bb = new Date(b.x);
            return aa > bb ? 1 : aa < bb ? -1 : 0;
        });
    });
}

function copyCloudAppData(chartdata, cloudappdata) {
    for(var i=0; i<cloudappdata.cloudApp.length; i++) {
        var cloudApp = cloudappdata.cloudApp[i];
        if(!statusExport.isAccepted(cloudApp.status) ||
            !cloudApp.dateQAFinished) {
            continue;
        }
        var size = getSizeData(chartdata, 'Development Time Total');
        size.data.push({
            x: cloudApp.dateQAFinished,
            y: cloudApp.storyPoints > 0 ? cloudApp.devTimeSpent/cloudApp.storyPoints : 0,
            tooltip: cloudApp.name + ' - ' + cloudApp.devTimeSpent.toFixed(2) + 'h - ' + cloudApp.storyPoints + 'SP - ' + cloudApp.teamName });
        size = getSizeData(chartdata, 'QA Time Total');
        size.data.push({
            x: cloudApp.dateQAFinished,
            y: cloudApp.storyPoints > 0 ? cloudApp.qaTimeSpent/cloudApp.storyPoints : 0,
            tooltip: cloudApp.name + ' - ' + cloudApp.qaTimeSpent.toFixed(2) + 'h - ' + cloudApp.storyPoints + 'SP - ' + cloudApp.teamName });
        if(cloudApp.teamName != '--') {
            size = getSizeData(chartdata, 'Dev Time ' + cloudApp.teamName);
            size.data.push({
                x: cloudApp.dateQAFinished,
                y: cloudApp.storyPoints > 0 ? cloudApp.devTimeSpent/cloudApp.storyPoints : 0,
                tooltip: cloudApp.name + ' - ' + cloudApp.devTimeSpent.toFixed(2) + 'h - ' + cloudApp.storyPoints + 'SP - ' + cloudApp.teamName });
            size = getSizeData(chartdata, 'QA Time ' + cloudApp.teamName);
            size.data.push({
                x: cloudApp.dateQAFinished,
                y: cloudApp.storyPoints > 0 ? cloudApp.qaTimeSpent/cloudApp.storyPoints : 0,
                tooltip: cloudApp.name + ' - ' + cloudApp.qaTimeSpent.toFixed(2) + 'h - ' + cloudApp.storyPoints + 'SP - ' + cloudApp.teamName });
        }
    }
}

function getSizeData(chartdata, sizeName) {
    for (var k = 0; k < chartdata.data.length; k++) {
        var size = chartdata.data[k];
        if (size.name == sizeName) {
            return size;
        }
    }
    var newSize = { data: [], name: sizeName, visible: sizeName == 'Development Time Total' || sizeName == 'QA Time Total' ? true : false};
    chartdata.data.push(newSize);
    return newSize;
}

function putDataPoint(cloudAppData, module, page) {
    var moduleGroupName = helpers.getModuleGroupName(page.labels);
    var cloudAppName = helpers.getCloudAppName(page.labels);
    var fixVersions = module.fixVersions;
    var moduleName = helpers.getModuleName(page.labels);
    var labels = module._doc.labels != null ? module._doc.labels : "";
    var teamName = helpers.getTeamName(labels);
    var dateQAFinished = new Date(Date.parse(page.qaFinished)).getTime();
    var storyPoints = page.storyPoints == null ? 0 : parseFloat(page.storyPoints);

    var timeSpent = helpers.getTimeSpent(page);

    var status = helpers.updateStatus(page);
    var cloudApp;
    for(var i=0; i<cloudAppData.cloudApp.length; i++) {
        if(cloudAppData.cloudApp[i].name == cloudAppName &&
            cloudAppData.cloudApp[i].moduleGroupName == moduleGroupName &&
            cloudAppData.cloudApp[i].moduleSummary == module.name &&
            cloudAppData.cloudApp[i].fixVersions == fixVersions) {
            cloudApp = cloudAppData.cloudApp[i];
            cloudApp.devTimeSpent += timeSpent.devTimeSpent;
            cloudApp.qaTimeSpent += timeSpent.qaTimeSpent;
            cloudApp.dateQAFinished = cloudApp.dateQAFinished < page.dateQAFinished ? page.dateQAFinished : cloudApp.dateQAFinished;
            cloudApp.storyPoints += storyPoints;

            var cloudAppStatus = statusList.getStatusByName(cloudApp.status);
            var pageStatus = statusList.getStatusByName(status);

            if(pageStatus.weight < cloudAppStatus.weight){
                cloudApp.status = status;
            }
        }
    }

    if(!cloudApp) {
        cloudApp = {
            name: cloudAppName,
            status: status,
            resolution: page.resolution,
            moduleGroupName: moduleGroupName,
            moduleName: moduleName,
            moduleSummary: module.name,
            fixVersions: fixVersions,
            devTimeSpent: timeSpent.devTimeSpent,
            qaTimeSpent: timeSpent.qaTimeSpent,
            dateQAFinished: dateQAFinished,
            teamName: teamName,
            storyPoints: storyPoints
        };
        cloudAppData.cloudApp.push(cloudApp);
    }
}
