var mongoose = require('../libs/mongoose');
var Module = require('../models/module').Module;
var Page = require('../models/page').Page;
var log = require('../libs/log')(module);
var persons = require('./persons');

exports.getData = function (req, res) {
    var id = req.params.id;
    getPage(id, function (err, page) {
        if (err) throw err;
        res.json(page);
    });
}

function getPage(id, callback) {
    var page = new Page();
    Page.find({key: id}, function (err, page) {
        callback(err, page[0]);
    })
}
