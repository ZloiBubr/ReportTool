/**
 * Created by Ilya_Kazlou1 on 2/4/2015.
 */

exports.LeaderDelayStatisticVm = function (options) {
    this.leader = options.assignee || "";
    this.cloudAppDelayStatistics = options.delayStatistics || [];
}

exports.DelayStatistic = function (options) {
    options = options || {};
    this.minRangeValue = options.minRangeValue;
    this.maxRangeValue = options.maxRangeValue;
    this.cloudApps = options.cloudApps || [];
}