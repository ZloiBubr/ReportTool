var mongoose = require('../libs/mongoose');
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
    return false;
}

function pagebysizeModel() {
    this.data = [
        {
            data: [],
            name: "XXXLDev"
        },
        {
            data: [],
            name: "XXLDev"
        },
        {
            data: [],
            name: "ExtraLargeDev"
        },
        {
            data: [],
            name: "LargePlusDev"
        },
        {
            data: [],
            name: "LargeDev"
        },
        {
            data: [],
            name: "MediumDev"
        },
        {
            data: [],
            name: "SmallDev"
        }
/*
        ,
        {
            data: [],
            name: "XXXLQA"
        },
        {
            data: [],
            name: "XXLQA"
        },
        {
            data: [],
            name: "ExtraLargeQA"
        },
        {
            data: [],
            name: "LargeQA"
        },
        {
            data: [],
            name: "LargePlusQA"
        },
        {
            data: [],
            name: "MediumQA"
        },
        {
            data: [],
            name: "SmallQA"
        }
*/
    ];
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
            if(page.resolution == "Out of Scope") {
                continue;
            }

            //interested only at finished pages
            if(page.devFinished == undefined) {
                continue;
            }
            var dateDevFinished = new Date(Date.parse(page.devFinished)).getTime();
            var dateQAFinished = new Date(Date.parse(page.qaFinished)).getTime();
            var pageSize = getPageSize(page.labels);
            var timeDevSpent = 0.;
            var timeQASpent = 0.;
            //calc time spent
            for (var j = 0; j < page.worklogHistory.length; j++) {
                var worklog = page.worklogHistory[j];
                if(isDeveloper(worklog.person)) {
                    timeDevSpent += parseFloat(worklog.timeSpent);
                }
                else {
                    timeQASpent += parseFloat(worklog.timeSpent);
                }
            }
            if(dateDevFinished > (new Date("Jan 1, 2014")).getTime() &&
                (
                page.status == "Resolved" ||
                page.status == "Closed"
                )) {
                putDataPoint(model, pageSize+"Dev", dateDevFinished, timeDevSpent, page);
            }
/*
            if(dateQAFinished > (new Date("Jan 1, 2014")).getTime() &&
                (timeQASpent > 1. && (
                page.status == "Resolved" ||
                page.status == "Closed"
                ))) {
                putDataPoint(model, pageSize+"QA", dateQAFinished, timeQASpent, page);
            }
*/
        }

        //2. sort
        for (var k = 0; k < model.data.length; k++) {
            var team = model.data[k];
            team.data.sort(function (a, b) {
                var aa = new Date(a.x);
                var bb = new Date(b.x);
                return aa > bb ? 1 : aa < bb ? -1 : 0;
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
