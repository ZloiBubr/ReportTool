function acceptanceStatisticsController($scope, $resource) {
    var resource = $resource('/acceptanceStatistics');
    var baseUrl = "https://jira.epam.com/jira/issues/?filter=-4&jql=";

    $scope.init = function () {
        $scope.total = {
            totalCurrent: 0,
            totalWithFirstRange : 0,
            totalWithSecondRange : 0,
            totalWithThirdRange : 0,
            totalWithFourthRange : 0,
            totalWithFifthRange : 0,
            commonTotal : getCommonTotal
        };

        $scope.loadData();
    }

    $scope.loadData = function () {
        var deferred = $.Deferred();

        var successCallback = function (data) {
            var statistics = [];
            var result = data.result;

            for (var i = 0; i < result.length; i++){
                var statistic = getLeaderStatistic(result[i]);

                $scope.total.totalCurrent += statistic.currentRangeAppCount;
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
        var delayStatisticWithCurrent = getDelayStatisticWithRange(leaderStatistic, 0, 0);
        var delayStatisticWithFirstRange = getDelayStatisticWithRange(leaderStatistic, 1, 15);
        var delayStatisticWithSecondRange = getDelayStatisticWithRange(leaderStatistic, 16, 30);
        var delayStatisticWithThirdRange = getDelayStatisticWithRange(leaderStatistic, 31, 45);
        var delayStatisticWithFourthRange = getDelayStatisticWithRange(leaderStatistic, 46, 60);
        var delayStatisticWithFifthRange = getDelayStatisticWithRange(leaderStatistic, 61, 10000);

        var statistic = {};
        statistic.leader = leaderStatistic.leader;
        statistic.currentRangeAppCount = delayStatisticWithCurrent.cloudApps.length;
        statistic.firstRangeAppCount = delayStatisticWithFirstRange.cloudApps.length;
        statistic.secondRangeAppCount = delayStatisticWithSecondRange.cloudApps.length;
        statistic.thirdRangeAppCount = delayStatisticWithThirdRange.cloudApps.length;
        statistic.fourthRangeAppCount = delayStatisticWithFourthRange.cloudApps.length;
        statistic.fifthRangeAppCount = delayStatisticWithFifthRange.cloudApps.length;

        statistic.currentRangeJiraLink = getJiraLink(delayStatisticWithCurrent.cloudApps);
        statistic.firstRangeJiraLink = getJiraLink(delayStatisticWithFirstRange.cloudApps);
        statistic.secondRangeJiraLink = getJiraLink(delayStatisticWithSecondRange.cloudApps);
        statistic.thirdRangeJiraLink = getJiraLink(delayStatisticWithThirdRange.cloudApps);
        statistic.fourthRangeJiraLink = getJiraLink(delayStatisticWithFourthRange.cloudApps);
        statistic.fifthRangeJiraLink = getJiraLink(delayStatisticWithFifthRange.cloudApps);

        statistic.total = function (){
            var total = statistic.currentRangeAppCount;
            total += statistic.firstRangeAppCount;
            total += statistic.secondRangeAppCount;
            total += statistic.thirdRangeAppCount;
            total += statistic.fourthRangeAppCount;
            total += statistic.fifthRangeAppCount;

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

    var getCommonTotal = function () {
        var total = $scope.total.totalCurrent;
        total += $scope.total.totalWithFirstRange;
        total += $scope.total.totalWithSecondRange;
        total += $scope.total.totalWithThirdRange;
        total += $scope.total.totalWithFourthRange;
        total += $scope.total.totalWithFifthRange;

        return total;
    };

    var getJiraLink = function (cloudApps) {
        if (!cloudApps || cloudApps.length < 1) return "javascript:void(0)";

        var params = "key=" + cloudApps.join(" or key=");
        var link = baseUrl + params;
        return link;
    }

    $scope.init();
}