var mongoose = require('../libs/mongoose');
var pagebysizeModel = require('../models/pagebysize').data;
var Module = require('../models/module').Module;
var Page = require('../models/page').Page;
var log = require('../libs/log')(module);
var persons = require('./persons');

exports.getData = function (req, res) {
    parsePages(function (err, data) {
        if (err) throw err;
        res.json(data);
    });
}

function parsePages(callback) {
    var model = new pagebysizeModel();
    for (var k = 0; k < model.data.length; k++) {
        var team = model.data[k];
        team.data = [];
    }
    //1. grab all pages
    Page.find({}).exec(function (err, pages) {
        for (var i = 0; i < pages.length; i++) {
            var page = pages[i];

            if(page.devFinished == undefined) {
                continue;
            }
            var dateDevFinished = page.devFinished == undefined ? new Date(Date.parse(page.updated)).getTime() : new Date(Date.parse(page.devFinished)).getTime();
//            var dateQaFinished = new Date(Date.parse(page.qaFinished)).getTime();
            var pageSize = getPageSize(page.labels);
            var timeSpent = 0;
            //calc time spent
            for (var j = 0; j < page.worklogHistory.length; j++) {
                var worklog = page.worklogHistory[j];
                if(persons.isDeveloper(worklog.person)!="Developer") {
                    continue;
                }

                timeSpent += parseInt(worklog.timeSpent);
            }
            if(timeSpent == 0) {
                continue;
            }
            putDataPoint(model, pageSize, dateDevFinished, timeSpent);
        }

        //2. sort
        for (var k = 0; k < model.data.length; k++) {
            var team = model.data[k];
            team.data.sort(function (a, b) {
                a = new Date(a[0]);
                b = new Date(b[0]);
                return a > b ? 1 : a < b ? -1 : 0;
            });
        }
        callback(err, model);
    })
}

function getPageSize(labels) {
    if (labels.indexOf("PageSizeSmall") > -1)
        return "Small";
    if (labels.indexOf("PageSizeMedium") > -1)
        return "Medium";
    if (labels.indexOf("PageSizeLarge") > -1)
        return "Large";
    if (labels.indexOf("PageSizeExtraLarge") > -1)
        return "ExtraLarge";
}

function putDataPoint(model, pageSize, dateDevFinished, timeSpent) {
    for (var k = 0; k < model.data.length; k++) {
        var size = model.data[k];
        if (size.name == pageSize) {
            size.data.push([dateDevFinished, timeSpent]);
            return;
        }
    }
}
