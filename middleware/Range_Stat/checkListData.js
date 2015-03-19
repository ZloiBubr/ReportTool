/**
 * Created by Ilya_Kazlou1 on 3/16/2015.
 */

var mongoose = require('../../libs/mongoose');
var _ = require('underscore');
var Issues = require('../../models/originalJiraIssue').Issue;
var cache = require('node_cache');
var STATUS = require('../../public/jsc/Models/statusList').STATUS;
var DateRangeService = require('./dateRangeProcessDataService').DateRangeService;

exports.getChecklists = function (req, res) {

    cache.getData("checkListData",function(setterCallback){
        parsePages(function (err, data) {
            if (err) throw err;
            setterCallback(data);
        });
    }, function(value){res.json(value);});
};

function parsePages(callback) {
    Issues.find({ issuetype: "Sub-task", "object.fields.summary": /.*\[PLEX.*/})
        .exec(function (err, checklists) {
            if (err) throw err;

            var propertyGetter = {
                getDue : function (entity) { return entity.object.fields.duedate; },
                getAssignee : function (entity) { return entity.object.fields.assignee ? entity.object.fields.assignee.displayName : ""; },
                getKey : function (entity) { return entity.key; }
            };
            DateRangeService.init(propertyGetter);

            var ranges = getDelayDayRanges();
            var viewModels = DateRangeService.getLeaderDelayStatisticVms(checklists, ranges);
            var result = { result : viewModels, ranges: getDelayDayRanges() };
            callback(err,result);
        });
}

function getDelayDayRanges() {
    return [
        {
            minRangeValue : null,//Not assigned date
            maxRangeValue: null,
            title: "Unspecified Date"
        },
        {
            minRangeValue : 1,
            maxRangeValue: 7,
            title: "1-7 Days Old"
        },
        {
            minRangeValue : 7,
            maxRangeValue: 14,
            title: "8-14 Days Old"
        },
        {
            minRangeValue : 15,
            maxRangeValue: 21,
            title: "15-21 Days Old"
        },
        {
            minRangeValue : 22,
            maxRangeValue: 28,
            title: "22-28 Days Old"
        },
        {
            minRangeValue : 29,
            maxRangeValue: 10000,
            title: ">28 Days Old"
        },
    ];
}