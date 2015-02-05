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

            $scope.total = {
                totalWithFirstRange : 0,
                totalWithSecondRange : 0,
                totalWithThirdRange : 0,
                totalWithFourthRange : 0,
                totalWithFifthRange : 0
            };

            for (var i = 0; i < result.length; i++){
                var statistic = getLeaderStatistic(result[i]);

                $scope.total.totalWithFirstRange += statistic.firstRangeAppCount;
                $scope.total.totalWithSecondRange += statistic.secondRangeAppCount;
                $scope.total.totalWithThirdRange += statistic.thirdRangeAppCount;
                $scope.total.totalWithFourthRange += statistic.fourthRangeAppCount;
                $scope.total.totalWithFifthRange += statistic.fifthRangeAppCount;

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

    var getLeaderStatistic  = function (leaderStatistic) {
        var delayStatisticWithFirstRange = getDelayStatisticWithRange(leaderStatistic, 1, 15);
        var delayStatisticWithSecondRange = getDelayStatisticWithRange(leaderStatistic, 16, 30);
        var delayStatisticWithThirdRange = getDelayStatisticWithRange(leaderStatistic, 31, 45);
        var delayStatisticWithFourthRange = getDelayStatisticWithRange(leaderStatistic, 46, 60);
        var delayStatisticWithFifthRange = getDelayStatisticWithRange(leaderStatistic, 61, 10000);

        var statistic = {};
        statistic.leader = leaderStatistic.leader;
        statistic.firstRangeAppCount = delayStatisticWithFirstRange.cloudApps.length;
        statistic.secondRangeAppCount = delayStatisticWithSecondRange.cloudApps.length;
        statistic.thirdRangeAppCount = delayStatisticWithThirdRange.cloudApps.length;
        statistic.fourthRangeAppCount = delayStatisticWithFourthRange.cloudApps.length;
        statistic.fifthRangeAppCount = delayStatisticWithFifthRange.cloudApps.length;

        statistic.firstRangeJiraLink = getJiraLink(delayStatisticWithFirstRange.cloudApps);
        statistic.secondRangeJiraLink = getJiraLink(delayStatisticWithSecondRange.cloudApps);
        statistic.thirdRangeJiraLink = getJiraLink(delayStatisticWithThirdRange.cloudApps);
        statistic.fourthRangeJiraLink = getJiraLink(delayStatisticWithFourthRange.cloudApps);
        statistic.fifthRangeJiraLink = getJiraLink(delayStatisticWithFifthRange.cloudApps);

        statistic.total = function (){
            var total = statistic.firstRangeAppCount + statistic.secondRangeAppCount + statistic.thirdRangeAppCount + statistic.fourthRangeAppCount + statistic.fifthRangeAppCount;
            return total;
        }

        return statistic;
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

    var getJiraLink = function (cloudApps) {


        return "#";
    }

    $scope.init();
}