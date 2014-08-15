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
};

function isDeveloper(name) {
    if (persons.isDeveloper(name)) {
            return true;
    }
    if(name == 'Valentine Zhuck' ||
        name == 'Dzmitry Tabolich' ||
        name == 'Heorhi Vilkitski') {
        return true;
    }
//    log.info("---###---" + name);
    return false;
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
                if(isDeveloper(worklog.person)) {
                    timeSpent += parseFloat(worklog.timeSpent);
                }
            }
            if(timeSpent > 0 ||
                page.status == 'Ready for QA' ||
                page.status == "Testing in Progress" ||
                page.status == "Resolved" ||
                page.status == "Closed"
                ) {
                putDataPoint(model, pageSize, dateDevFinished, timeSpent, page);
            }
        }

        //2. sort
        for (var k = 0; k < model.data.length; k++) {
            var team = model.data[k];
            team.data.sort(function (a, b) {
                a = new Date(a.x);
                b = new Date(b.x);
                return a > b ? 1 : a < b ? -1 : 0;
            });
        }
        callback(err, model);
    })
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

function getPageSize(labels) {
    if (labels.indexOf("PageSizeSmall") > -1)
        return "Small";
    if (labels.indexOf("PageSizeMedium") > -1)
        return "Medium";
    if (labels.indexOf("PageSizeLargePlus") > -1)
        return "LargePlus";
    if (labels.indexOf("PageSizeLarge") > -1)
        return "Large";
    if (labels.indexOf("PageSizeExtraLarge") > -1)
        return "ExtraLarge";
    if (labels.indexOf("PageSizeXXL") > -1)
        return "XXL";
    if (labels.indexOf("PageSizeXXXL") > -1)
        return "XXXL";
}

function putDataPoint(model, pageSize, dateDevFinished, timeSpent, page) {
    for (var k = 0; k < model.data.length; k++) {
        var size = model.data[k];
        if (size.name == pageSize) {
            size.data.push({
                x: dateDevFinished,
                y: timeSpent,
                tooltip: page.key + ' - ' + timeSpent.toFixed(2) + 'h - ' + getTeamName(page.labels) });
            return;
        }
    }
}
