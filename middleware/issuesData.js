/**
 * Created by Heorhi_Vilkitski on 8/5/2014.
 */
var mongoose = require('../libs/mongoose');
var Module = require('../models/module').Module;
var Page = require('../models/page').Page;
var Issue = require('../models/issue').Issue;
var teamsModels = require('../models/issuesViewModel');
var log = require('../libs/log')(module);
var async = require('async');
var _ = require('underscore');

exports.getData = function (req, res) {
    parsePages(function (err, personaldata) {
        if (err) throw err;
        res.json(personaldata);
    });
};


function parsePages(callback) {
    Issue.find({},function(err,pages){

        callback();
    });
}
