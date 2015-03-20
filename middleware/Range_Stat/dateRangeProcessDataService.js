var DelayStatistic = require('../../models/leaderDelayStatisticViewModel').DelayStatistic;
var LeaderDelayStatisticVm = require('../../models/leaderDelayStatisticViewModel').LeaderDelayStatisticVm;
var leaderDictionary = require('../../models/allLeaders').AllLeaders;

function DateRangeProcessDataService() {
    var self = this;

    /***********Public Members***********/

    self.init = function (propertyGetter){
        self.propertyGetter = propertyGetter;
    };

    self.getLeaderDelayStatisticVms = function (entities, delayRanges) {
        var viewModels = [];

        for (var leaderName in leaderDictionary){
            var delayStatistics = [];

            for (var i = 0; i < delayRanges.length; i++){
                var delayStatistic = getStatisticByLeaderAndRange(leaderName, delayRanges[i], entities);
                delayStatistics.push(delayStatistic);
            }

            var leaderDelayStatisticVm = new LeaderDelayStatisticVm({
                assignee: leaderName,
                delayStatistics: delayStatistics,
                SME: leaderDictionary[leaderName].SME
            });

            if (checkLeaderDelayStatisticsOnZero(leaderDelayStatisticVm.entityDelayStatistics)) {
                viewModels.push(leaderDelayStatisticVm);
            }
        }

        return viewModels;
    };

    /***********Private Members***********/

    var getStatisticByLeaderAndRange = function (leaderName, range, entities){
        var delayStatistic = new DelayStatistic({minRangeValue: range.minRangeValue, maxRangeValue: range.maxRangeValue});
        for (var i = 0; i < entities.length; i++){
            var currentDue = self.propertyGetter.getDue(entities[i]);
            var currentAssignee = self.propertyGetter.getAssignee(entities[i]);
            var currentKey = self.propertyGetter.getKey(entities[i]);

            var delayInDay = getDayDiff(currentDue);

            if (currentAssignee === leaderName) {
                if (delayInDay != null && range.minRangeValue != null && range.maxRangeValue != null) {
                    if (delayInDay >= range.minRangeValue && delayInDay <= range.maxRangeValue) {
                        delayStatistic.entities.push(currentKey);
                        continue;
                    }
                }

                if (delayInDay == null && range.minRangeValue == null && range.maxRangeValue == null) {
                    delayStatistic.entities.push(currentKey);
                }
            }
        }

        return delayStatistic;
    };

    var checkLeaderDelayStatisticsOnZero = function (delayStatistics) {
        for (var i = 0; i < delayStatistics.length; i++){
            if (delayStatistics[i].entities && delayStatistics[i].entities.length > 0){
                return true;
            }
        }

        return false;
    };

    var getDayDiff = function (dueDate) {
        if (!dueDate) {
            return null;
        }

        var date1 = Date.now();
        var date2 = new Date(dueDate);
        var timeDiff = date1 - date2.getTime();
        var diffDays = Math.ceil(timeDiff / (1000 * 3600 * 24));
        return diffDays;
    };
}

exports.DateRangeService = new DateRangeProcessDataService();
