/**
 * Created by Ilya_Kazlou1 on 2/4/2015.
 */

exports.LeaderDelayStatisticVm = function (options) {
    this.leader = options.assignee || "";
    this.cloudAppDelayStatistics = options.delayStatistics || [];
}

exports.DelayStatistic = function (options) {
    options = options || {};
    this.minRangeValue = options.minRangeValue || 0;
    this.maxRangeValue = options.maxRangeValue || 0;
    this.cloudAppCount = options.cloudApps ? options.cloudApps.length : 0;
    this.cloudApps = options.cloudApps || [];
}