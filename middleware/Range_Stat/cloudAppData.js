/**
 * Created by Ilya_Kazlou1 on 2/4/2015.
 */

var mongoose = require('../../libs/mongoose');
var _ = require('underscore');
var CloudApp = require('../../models/cloudApp').CloudApp;
var cache = require('node_cache');
var STATUS = require('../../public/jsc/Models/statusList').STATUS;
var DateRangeService = require('./dateRangeProcessDataService').DateRangeService;

exports.getCloudApps = function (req, res) {

    cache.getData("cloudAppData",function(setterCallback){
        parsePages(function (err, data) {
            if (err) throw err;
            setterCallback(data);
        });
    }, function(value){res.json(value);});
};

function parsePages(callback) {
    CloudApp.find({status: {$nin:[STATUS.CLOSED.name, STATUS.RESOLVED.name]}})
        .exec(function (err, cloudApps) {
        if (err) throw err;

        var propertyGetter = {
            getDue : function (entity) { return entity.duedate; },
            getAssignee : function (entity) { return entity.assignee; },
            getKey : function (entity) { return entity.key; }
        };
        DateRangeService.init(propertyGetter);

        var ranges = getDelayDayRanges();
        var viewModels = DateRangeService.getLeaderDelayStatisticVms(cloudApps, ranges);
        var result = { result : viewModels, ranges: getDelayDayRanges() };
        callback(err,result);
    });
};

function getDelayDayRanges() {
    return [
        {
            minRangeValue : null,//Not assigned date
            maxRangeValue: null,
            title: "Unspecified Date"
        },
        {
            minRangeValue : -99999,//Current
            maxRangeValue: 0,
            title: "Current"
        },
        {
            minRangeValue : 1,
            maxRangeValue: 15,
            title: "1-15 Days Past Due"
        },
        {
            minRangeValue : 16,
            maxRangeValue: 30,
            title: "16-30 Days Past Due"
        },
        {
            minRangeValue : 31,
            maxRangeValue: 45,
            title: "31-45 Days Past Due"
        },
        {
            minRangeValue : 46,
            maxRangeValue: 60,
            title: "46-60 Days Past Due"
        },
        {
            minRangeValue : 61,
            maxRangeValue: 10000,
            title: "60 Days Past Due"
        },
    ];
}


