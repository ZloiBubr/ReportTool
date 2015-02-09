/**
 * Created by Ilya_Kazlou1 on 2/4/2015.
 */

var mongoose = require('../libs/mongoose');
var _ = require('underscore');
var CloudApp = require('../models/cloudApp').CloudApp;
var DelayStatistic = require('../models/leaderDelayStatisticViewModel').DelayStatistic;
var LeaderDelayStatisticVm = require('../models/leaderDelayStatisticViewModel').LeaderDelayStatisticVm;
var cache = require('node_cache');
var STATUS = require('../public/jsc/models/statusList').STATUS;

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
        .populate('_epic')
        .exec(function (err, cloudApps) {
        if (err) throw err;
        var result = { result : getLeaderDelayStatisticVms(cloudApps) };
        callback(err,result);
    });
}

function getLeaderDelayStatisticVms(cloudApps) {
    var viewModels = [];
    var delayRanges = getDelayDayRanges();
    var allLeader = getAllLeaders(cloudApps);
    for(var j = 0; j <  allLeader.length; j++){
        var delayStatistics = [];
        var leaderName = allLeader[j];
        var SME = "";

        for (var i = 0; i < delayRanges.length; i++){
            var delayStatistic = getStatisticByLeaderAndRange(leaderName, delayRanges[i], cloudApps);
            SME = SME || delayStatistic.SME ;
            delayStatistics.push(delayStatistic.delayStatistic);
        }

        var leaderDelayStatisticVm = new LeaderDelayStatisticVm({ assignee: leaderName, delayStatistics: delayStatistics, SME: SME });
        if (checkLeaderDelayStatisticsOnZero(leaderDelayStatisticVm.cloudAppDelayStatistics)) {
            viewModels.push(leaderDelayStatisticVm);
        }
    }

    return viewModels;
}

function getAllLeaders(cloudApps) {
    var leaders = [];

    if (!cloudApps || cloudApps.length < 1) {
        return leaders;
    }

    for (var i = 0; i < cloudApps.length; i++){
        var leaderName = cloudApps[i].assignee;
        if (!IsLeaderInArray(leaders, leaderName)){
            leaders.push(leaderName);
        }else{
            continue;
        }
    }

    return leaders;
}

function getDelayDayRanges() {
    return [
        {
            minRangeValue : null,//Current
            maxRangeValue: null //Not assigned date
        },
        {
            minRangeValue : -99999,//Current
            maxRangeValue: 0
        },
        {
            minRangeValue : 1,
            maxRangeValue: 15
        },
        {
            minRangeValue : 16,
            maxRangeValue: 30
        },
        {
            minRangeValue : 31,
            maxRangeValue: 45
        },
        {
            minRangeValue : 46,
            maxRangeValue: 60
        },
        {
            minRangeValue : 61,
            maxRangeValue: 10000
        },
    ];
}

function getStatisticByLeaderAndRange(leaderName, range, cloudApps){
    var delayStatistic = new DelayStatistic({minRangeValue: range.minRangeValue, maxRangeValue: range.maxRangeValue});
    var SME;
    for (var i = 0; i < cloudApps.length; i++){
        var delayInDay = getDayDiff(cloudApps[i].duedate);

        if (cloudApps[i].assignee === leaderName) {
            if (delayInDay != null && range.minRangeValue != null && range.maxRangeValue != null) {
                if (delayInDay >= range.minRangeValue && delayInDay <= range.maxRangeValue) {
                    delayStatistic.cloudApps.push(cloudApps[i].key);
                    if(!_.isEmpty(cloudApps[i]._epic.assignee)){
                        SME = SME || cloudApps[i]._epic.assignee;
                    }

                    continue;
                }
            }

            if (delayInDay == null && range.minRangeValue == null && range.maxRangeValue == null) {
                delayStatistic.cloudApps.push(cloudApps[i].key);
            }
        }
    }

    return {delayStatistic: delayStatistic, SME: SME};
}

function IsLeaderInArray(arr, leaderName) {
    for (var i = 0; i < arr.length; i++){
        if (leaderName == arr[i]){
            return true;
        }
    }

    return false;
}

function checkLeaderDelayStatisticsOnZero(delayStatistics) {
    for (var i = 0; i < delayStatistics.length; i++){
        if (delayStatistics[i].cloudApps && delayStatistics[i].cloudApps.length > 0){
            return true;
        }
    }

    return false;
}

function getDayDiff(dueDate) {
    if (!dueDate) {
        return null;
    }

    var date1 = Date.now();
    var date2 = new Date(dueDate);
    var timeDiff = date1 - date2.getTime();
    var diffDays = Math.ceil(timeDiff / (1000 * 3600 * 24));
    return diffDays;
}


