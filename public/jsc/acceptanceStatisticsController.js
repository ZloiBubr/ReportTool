function acceptanceStatisticsController($scope, $resource) {
    var resource = $resource('/acceptanceStatistics');

    $scope.init = function () {
        $scope.loadData();
    }

    $scope.loadData = function () {
        var deferred = $.Deferred();

        var successCallback = function (data) {
            var statistics = [];
            var result = data.result;

            for (var i = 0; i < result.length; i++){
                var statistic = {};
                statistic.leader = result[i].leader;
                statistic.firstRangeAppCount = getDelayStatisticWithRange(result[i], 1, 15).cloudApps.length;
                statistic.secondRangeAppCount = getDelayStatisticWithRange(result[i], 16, 30).cloudApps.length;

                statistics.push(statistic);
            }

            $scope.statistics = statistics;

            deferred.resolve();
        };

        var errorCallback = function (err) {
            $scope.errMessage = err;
            deferred.reject(err);
        };

        resource.get(successCallback, errorCallback);
    }

    var getDelayStatisticWithRange = function (leaderStatistic, min, max) {
        var delayStatistics = leaderStatistic.cloudAppDelayStatistics;

        for (var i = 0; i < delayStatistics.length; i++){
            if (delayStatistics[i].minRangeValue >= min && delayStatistics[i].maxRangeValue <= max) {
                return delayStatistics[i];
            }
        }

        return {};
    }

    $scope.init();
}