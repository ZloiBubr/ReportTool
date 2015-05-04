var mongoose = require('../libs/mongoose');
var Module = require('../models/module').Module;
var Page = require('../models/page').Page;
var log = require('../libs/log')(module);
var _ = require('underscore');

exports.getData = function (req, res) {
    var id = req.params.id;
    getPage(id, function (err, page) {
        if (err) throw err;
        res.json(page);
    });
};

function PersonWorklog(person, spent) {
    this.person = person;
    this.spent = spent;
}

function ProgressData() {
    this.series = [
        {
            data: [[
                Date.now(),
                0
            ]],
            name: ""
        }
    ];
}

function PutSeriesPoint(pData, pName, dateC, progress) {
    var seriesData = null;
    _.each(pData.series, function(series) {
        if (series.name == pName) {
            seriesData = series;
            series.data.push([dateC, progress]);
        }
    });
    if(!seriesData) {
        pData.series.push({name: pName, data: [
            [dateC, progress]
        ]});
    }
}

function getPage(id, callback) {

    Page.find({key: id}, function (err, page) {
        Module.findOne({ key: page[0].epicKey }, function (err, module) {
            if (err) throw err;

            if (module) {
                page[0]._doc.moduleSummary = module.summary;
            }
            if(page[0]._doc.devFinished){
                page[0]._doc.devFinished = (new Date(Date.parse(page[0]._doc.devFinished))).toDateString();
            }
            if(page[0]._doc.qaFinished) {
                page[0]._doc.devFinished = (new Date(Date.parse(page[0]._doc.qaFinished))).toDateString();
            }

            var pData = new ProgressData();
            pData.series = [];
            var progressHistory = page[0]._doc.progressHistory;
            for (var j = 0; j < progressHistory.length; j++) {
                var history = progressHistory[j];
                var person = history.person;

                var progress = parseInt(history.progressTo);
                var dateC = Date.parse(history.dateChanged);
                var pName = person + " progress";

                PutSeriesPoint(pData, pName, dateC, progress);
            }

            //sort history by dates
            var worklogHistory = page[0]._doc.worklogHistory;
            worklogHistory.sort(function (a, b) {
                a = new Date(Date.parse(a._doc.dateStarted));
                b = new Date(Date.parse(b._doc.dateStarted));
                return a > b ? 1 : a < b ? -1 : 0;
            });

            var persons = [];
            for (var j = 0; j < worklogHistory.length; j++) {
                var worklog = worklogHistory[j];
                var found = false;
                var person2 = worklog.person;
                var spent = parseFloat(worklog.timeSpent);
                var progress2 = spent;
                for(var i=0; i<persons.length; i++) {
                    if(persons[i].person == person2) {
                        found = true;
                        persons[i].spent += spent;
                        progress = persons[i].spent;
                        break;
                    }
                }
                if(!found) {
                    var personW = new PersonWorklog(person, spent);
                    persons.push(personW);
                }

                var dateC2 = Date.parse(worklog.dateStarted);
                var pName2 = person + " hours";

                PutSeriesPoint(pData, pName2, dateC2, progress2);
            }
            page[0]._doc.worklogPersons = persons;
            page[0]._doc.pData = pData;

            callback(err, page[0]);
        });
    });
}
