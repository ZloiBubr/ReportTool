var mongoose = require('../libs/mongoose');
var Module = require('../models/module').Module;
var Page = require('../models/page').Page;
var log = require('../libs/log')(module);

exports.getData = function (req, res) {
    var id = req.params.id;
    getPage(id, function (err, page) {
        if (err) throw err;
        res.json(page);
    });
};

function personWorklog(person, spent) {
    this.person = person;
    this.spent = spent;
}

function progressData() {
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
    var found = false;
    for (var i = 0; i < pData.series.length; i++) {
        if (pData.series[i].name == pName) {
            found = true;
            pData.series[i].data.push([dateC, progress]);
            break;
        }
    }
    if (!found) {
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

            var pData = new progressData();
            pData.series = [];
            for (var j = 0; j < page[0]._doc.progressHistory.length; j++) {
                var history = page[0]._doc.progressHistory[j];
                var person = history.person;

                var progress = parseInt(history.progressTo);
                var dateC = Date.parse(history.dateChanged);
                var pName = person + " progress";

                PutSeriesPoint(pData, pName, dateC, progress);
            }

            //sort history by dates
            var historyData = page[0]._doc.worklogHistory;
            historyData.sort(function (a, b) {
                a = new Date(Date.parse(a._doc.dateStarted));
                b = new Date(Date.parse(b._doc.dateStarted));
                return a > b ? 1 : a < b ? -1 : 0;
            });

            var persons = [];
            for (var j = 0; j < historyData.length; j++) {
                var worklog = historyData[j];
                var found = false;
                var person = worklog.person;
                var spent = parseFloat(worklog.timeSpent);
                var progress = spent;
                for(var i=0; i<persons.length; i++) {
                    if(persons[i].person == person) {
                        found = true;
                        persons[i].spent += spent;
                        progress = persons[i].spent;
                        break;
                    }
                }
                if(!found) {
                    var personW = new personWorklog(person, spent);
                    persons.push(personW);
                }

                var dateC = Date.parse(worklog.dateStarted);
                var pName = person + " hours";

                PutSeriesPoint(pData, pName, dateC, progress);
            }
            page[0]._doc.worklogPersons = persons;
            page[0]._doc.pData = pData;

            callback(err, page[0]);
        })
    })
}
