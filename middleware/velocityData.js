var mongoose = require('libs/mongoose');
var velocity = require('../models/velocity').data;
var Module = require('models/module').Module;
var Page = require('models/page').Page;

exports.getData = function() {
    var data = new velocity();

    //1. grab all pages
    Page.find({}, function(err, pages){

    })

    return data;
}