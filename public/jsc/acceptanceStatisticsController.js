function acceptanceStatisticsController($scope, $resource) {
    var resource = $resource('/acceptanceStatistics');
    var baseUrl = "https://jira.epam.com/jira/issues/?jql=";

    $scope.init = function () {
        $scope.isOnlySmeMode = true;
        $scope.loadData().done($scope.prepareData);
    };


    $scope.reinit = function(){
        $scope.prepareData()
    };

    $scope.prepareData  = function (){
        var statistics = [];
        var smeAcceptanceData = [];
        $scope.total = {
            totalUnspecifiedDate: 0,
            totalCurrent: 0,
            totalWithFirstRange : 0,
            totalWithSecondRange : 0,
            totalWithThirdRange : 0,
            totalWithFourthRange : 0,
            totalWithFifthRange : 0,
            commonTotal : getCommonTotal
        };
        if($scope.isOnlySmeMode) {
            var emptyLeaderVm = jQuery.extend(true, {},_.find($scope.smeAcceptanceData, function (item) {
                if (item.leader === "") return item;
            }));

            var groupedbySme = _.groupBy($scope.smeAcceptanceData, function (item) {
                return item.SME;
            });

            addSmeFromEmptyVm(emptyLeaderVm, groupedbySme);

            _.each(groupedbySme, function(leadersArrayItem){
                var groupedSmeItem = jQuery.extend(true, {}, leadersArrayItem[0]);

                if (groupedSmeItem.SME === "") return false;

                for(var i=1; i<leadersArrayItem.length;i++){
                    for(var l=0; l< leadersArrayItem[i].cloudAppDelayStatistics.length; l++){
                        var cloudappItem = leadersArrayItem[i].cloudAppDelayStatistics[l];
                        groupedSmeItem.cloudAppDelayStatistics[l].cloudApps.push.apply(groupedSmeItem.cloudAppDelayStatistics[l].cloudApps,cloudappItem.cloudApps);
                    }
                }

                addRecordsWithUnspecifiedDate(groupedSmeItem,emptyLeaderVm);
                smeAcceptanceData.push(groupedSmeItem);
            });
        }
        else{
            smeAcceptanceData =  $scope.smeAcceptanceData;
        }

        for (var i = 0; i <  smeAcceptanceData.length; i++){
            var statistic = getLeaderStatistic( smeAcceptanceData[i]);

            $scope.total.totalUnspecifiedDate += statistic.notAssignedDueAppCount;
            $scope.total.totalCurrent += statistic.currentRangeAppCount;
            $scope.total.totalWithFirstRange += statistic.firstRangeAppCount;
            $scope.total.totalWithSecondRange += statistic.secondRangeAppCount;
            $scope.total.totalWithThirdRange += statistic.thirdRangeAppCount;
            $scope.total.totalWithFourthRange += statistic.fourthRangeAppCount;
            $scope.total.totalWithFifthRange += statistic.fifthRangeAppCount;

            statistics.push(statistic);
        }

        $scope.statistics = statistics;
    };

    $scope.loadData = function () {
        var deferred = $.Deferred();

        var successCallback = function (data) {
            $scope.smeAcceptanceData = data.result;
            deferred.resolve();
        };

        var errorCallback = function (err) {
            $scope.errMessage = err;
            deferred.reject(err);
        };

        resource.get(successCallback, errorCallback);
        return deferred.promise();
    }

    var getLeaderStatistic  = function (leaderStatistic) {
        var statisticWithNotAssignedDue = getDelayStatisticWithRange(leaderStatistic, null, null);
        var delayStatisticWithCurrent = getDelayStatisticWithRange(leaderStatistic, -99999, 0);
        var delayStatisticWithFirstRange = getDelayStatisticWithRange(leaderStatistic, 1, 15);
        var delayStatisticWithSecondRange = getDelayStatisticWithRange(leaderStatistic, 16, 30);
        var delayStatisticWithThirdRange = getDelayStatisticWithRange(leaderStatistic, 31, 45);
        var delayStatisticWithFourthRange = getDelayStatisticWithRange(leaderStatistic, 46, 60);
        var delayStatisticWithFifthRange = getDelayStatisticWithRange(leaderStatistic, 61, 10000);

        var statistic = {};
        statistic.leader = $scope.isOnlySmeMode ? leaderStatistic.SME :leaderStatistic.leader;
        statistic.notAssignedDueAppCount = statisticWithNotAssignedDue.cloudApps.length;
        statistic.currentRangeAppCount = delayStatisticWithCurrent.cloudApps.length;
        statistic.firstRangeAppCount = delayStatisticWithFirstRange.cloudApps.length;
        statistic.secondRangeAppCount = delayStatisticWithSecondRange.cloudApps.length;
        statistic.thirdRangeAppCount = delayStatisticWithThirdRange.cloudApps.length;
        statistic.fourthRangeAppCount = delayStatisticWithFourthRange.cloudApps.length;
        statistic.fifthRangeAppCount = delayStatisticWithFifthRange.cloudApps.length;

        statistic.notAssignedDueJiraLink = getJiraLink(statisticWithNotAssignedDue.cloudApps);
        statistic.currentRangeJiraLink = getJiraLink(delayStatisticWithCurrent.cloudApps);
        statistic.firstRangeJiraLink = getJiraLink(delayStatisticWithFirstRange.cloudApps);
        statistic.secondRangeJiraLink = getJiraLink(delayStatisticWithSecondRange.cloudApps);
        statistic.thirdRangeJiraLink = getJiraLink(delayStatisticWithThirdRange.cloudApps);
        statistic.fourthRangeJiraLink = getJiraLink(delayStatisticWithFourthRange.cloudApps);
        statistic.fifthRangeJiraLink = getJiraLink(delayStatisticWithFifthRange.cloudApps);

        statistic.total = function (){
            var total = statistic.currentRangeAppCount;
            total += statistic.notAssignedDueAppCount;
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
            if ((min === null || max === null) && (delayStatistics[i].minRangeValue === null || delayStatistics[i].maxRangeValue === null)) {
                return delayStatistics[i];
            }

            if (delayStatistics[i].minRangeValue === null || delayStatistics[i].maxRangeValue === null) {
                continue;
            }

            if (delayStatistics[i].minRangeValue >= min && delayStatistics[i].maxRangeValue <= max) {
                return delayStatistics[i];
            }
        }

        return {};
    }

    var addRecordsWithUnspecifiedDate = function (groupItem, targetEmptyVm){
        if (!targetEmptyVm.cloudAppDelayStatistics) return;

        for (var j = 0; j < targetEmptyVm.cloudAppDelayStatistics.length; j++) {
            var currentDelayStatistic = targetEmptyVm.cloudAppDelayStatistics[j];
            var targetDelayRange = getDelayStatisticWithRange(groupItem, currentDelayStatistic.minRangeValue, currentDelayStatistic.maxRangeValue);
            for (var k = 0; k < currentDelayStatistic.cloudApps.length; k++) {
                if (groupItem.SME === currentDelayStatistic.cloudAppSmes[k]) {
                    targetDelayRange.cloudApps.push(currentDelayStatistic.cloudApps[k]);
                }
            }
        }
    };

    var addSmeFromEmptyVm = function (targetEmptyVm, allGroups) {
        for (var j = 0; j < targetEmptyVm.cloudAppDelayStatistics.length; j++) {
            var currentDelayStatistic = targetEmptyVm.cloudAppDelayStatistics[j];
            for (var k = 0; k < currentDelayStatistic.cloudApps.length; k++) {
                var record = _.find(allGroups, function (item) {
                    return item[0] && item[0].SME == currentDelayStatistic.cloudAppSmes[k];
                });

                if (!record) {
                    var newSmeName = currentDelayStatistic.cloudAppSmes[k];
                    allGroups[newSmeName] = [getEmptyRecord("", newSmeName)];
                }
            }
        }
    }

    var getEmptyRecord = function (leaderName, smeName) {
        return { SME: smeName, leader : leaderName, cloudAppDelayStatistics : [
            { minRangeValue: null, maxRangeValue: null, cloudApps: []},
            {minRangeValue: -99999, maxRangeValue: 0, cloudApps: []},
            {minRangeValue: 1, maxRangeValue: 15, cloudApps: []},
            {minRangeValue: 16, maxRangeValue: 30, cloudApps: []},
            {minRangeValue: 31, maxRangeValue: 45, cloudApps: []},
            {minRangeValue: 46, maxRangeValue: 60, cloudApps: []},
            {minRangeValue: 61, maxRangeValue: 10000, cloudApps: []}
        ]};
    }

    var getCommonTotal = function () {
        var total = $scope.total.totalCurrent;
        total += $scope.total.totalUnspecifiedDate;
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