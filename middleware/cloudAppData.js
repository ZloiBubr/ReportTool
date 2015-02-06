/**
 * Created by Ilya_Kazlou1 on 2/4/2015.
 */

var mongoose = require('../libs/mongoose');
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
    CloudApp.find({status: {$nin:[STATUS.CLOSED.name, STATUS.RESOLVED.name]}}, function (err, cloudApps) {
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

        for (var i = 0; i < delayRanges.length; i++){
            var delayStatistic = getStatisticByLeaderAndRange(leaderName, delayRanges[i], cloudApps);
            delayStatistics.push(delayStatistic);
        }

        var leaderDelayStatisticVm = new LeaderDelayStatisticVm({ assignee: leaderName, delayStatistics: delayStatistics });
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
            minRangeValue : 0,//Current
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
    for (var i = 0; i < cloudApps.length; i++){
        var delayInDay = getDayDiff(cloudApps[i].sme_complete);
        if (cloudApps[i].assignee === leaderName){
            if (delayInDay >= range.minRangeValue && delayInDay <= range.maxRangeValue) {
                delayStatistic.cloudApps.push(cloudApps[i].key);
            }
        }
    }

    delayStatistic.cloudAppCount = delayStatistic.cloudApps.length;

    return delayStatistic;
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
    var date1 = Date.now();
    var date2 = new Date(dueDate);
    var timeDiff = Math.abs(date2.getTime() - date1);
    var diffDays = Math.ceil(timeDiff / (1000 * 3600 * 24));
    return diffDays;
}


