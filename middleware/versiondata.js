var mongoose = require('../libs/mongoose');
var helpers = require('../middleware/helpers');

var Version = require('../models/Version').Version;
var log = require('../libs/log')(module);
var async = require('async');
var _ = require('underscore');
var VERSION = require('../public/jsc/versions').VERSION;


exports.getData = function (req, res) {
    parsePages(function (versionData) {
        res.json(versionData);
    });
};

function versionData() {
    this.version = {};
}

function parsePages(callback) {
    var versiondata = new versionData();
    versiondata.version = {};

    Version.find({numerical: VERSION.NUMBER}).exec(function(err, versions) {
        if(versions && versions.length > 0) {
            versiondata.version.number = versions[0].numerical;
            versiondata.version.name = versions[0].name;
            versiondata.version.updated = versions[0].updated;
        }
        callback(versiondata);
    });
}
