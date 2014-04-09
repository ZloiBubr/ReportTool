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

function getPage(id, callback) {
    var page = new Page();
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
            var persons = [];
            for (var j = 0; j < page[0]._doc.worklogHistory.length; j++) {
                var worklog = page[0]._doc.worklogHistory[j];
                var found = false;
                var person = worklog.person;
                var spent = parseFloat(worklog.timeSpent);
                for(var i=0; i<persons.length; i++) {
                    if(persons[i].person == person) {
                        found = true;
                        persons[i].spent += spent;
                        break;
                    }
                }
                if(!found) {
                    var personW = new personWorklog(person, spent);
                    persons.push(personW);
                }
            }
            page[0]._doc.worklogPersons = persons;

            callback(err, page[0]);
        })
    })
}
