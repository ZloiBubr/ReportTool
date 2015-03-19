/**
 * Created by Ilya_Kazlou1 on 2/4/2015.
 */

exports.LeaderDelayStatisticVm = function (options) {
    this.leader = options.assignee || "";
    this.SME = options.SME || "";
    this.entityDelayStatistics = options.delayStatistics || [];
}

exports.DelayStatistic = function (options) {
    options = options || {};
    this.minRangeValue = options.minRangeValue;
    this.maxRangeValue = options.maxRangeValue;
    this.entities = options.entities || [];
}