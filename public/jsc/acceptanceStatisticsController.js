function acceptanceStatisticsController($scope, $resource, $stateParams, $state) {
    var routes = { checklistRoute : '/checklistDueDateStatistic', acceptanceRoute : '/acceptanceStatistics', bugRoute : '/bugDueDateStatistic' };
    var baseUrl = "https://jira.epam.com/jira/issues/?jql=";

    $scope.init = function () {
        var currentEntity = $stateParams.displayedEntity || "Acceptance Task";
        $scope.currentEntity = currentEntity;
        $scope.isOnlySmeMode = true;
        $scope.chooseEntity();
    };

    $scope.reinit = function(){
        $scope.prepareData()
    };
    
    $scope.changeState = function () {
        $state.go('acceptanceStatistics', { displayedEntity : $scope.currentEntity });
    }

    $scope.chooseEntity = function (){
        if ($scope.currentEntity == "Acceptance Task") {
            resource = $resource(routes.acceptanceRoute);
            $state.go('acceptanceStatistics', { displayedEntity : $scope.currentEntity });
        }

        if ($scope.currentEntity == "Checklist"){
            resource = $resource(routes.checklistRoute);
        }

        if ($scope.currentEntity == "Bug"){
            resource = $resource(routes.bugRoute);
        }

        $scope.loadData().done($scope.prepareData);
    };

    $scope.prepareData  = function (){
        var statistics = [];
        var smeAcceptanceData = [];

        var totals = [];
        for (var i = 0; i < $scope.ranges.length; i++){
            totals.push(0);
        }
        $scope.totals = totals;

        if($scope.isOnlySmeMode) {
            var groupedbySme = _.groupBy($scope.smeAcceptanceData, function (item) {
                return item.SME;
            });

            _.each(groupedbySme, function(leadersArrayItem){
                var groupedSmeItem = jQuery.extend(true, {}, leadersArrayItem[0]);

                if (groupedSmeItem.SME === "") return false;

                for(var i=1; i<leadersArrayItem.length;i++){
                    for(var l=0; l< leadersArrayItem[i].entityDelayStatistics.length; l++){
                        var cloudAppItem = leadersArrayItem[i].entityDelayStatistics[l];
                        groupedSmeItem.entityDelayStatistics[l].entities.push.apply(groupedSmeItem.entityDelayStatistics[l].entities, cloudAppItem.entities);
                    }
                }

                smeAcceptanceData.push(groupedSmeItem);
            });
        }
        else{
            smeAcceptanceData =  $scope.smeAcceptanceData;
        }

        for (var i = 0; i <  smeAcceptanceData.length; i++){
            var statistic = getLeaderStatistic( smeAcceptanceData[i]);

            for (var j = 0; j < statistic.delayStatistics.length; j++){
                $scope.totals[j] += statistic.delayStatistics[j].count;
            }

            statistics.push(statistic);
        }

        $scope.statistics = statistics;
    };

    $scope.loadData = function () {
        var deferred = $.Deferred();

        var successCallback = function (data) {
            $scope.smeAcceptanceData = data.result;
            $scope.ranges = data.ranges;
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
        var leaderDelayStatistics = [];
        for (var i = 0; i < $scope.ranges.length; i++){
            var delayStatistic = getDelayStatisticWithRange(leaderStatistic, $scope.ranges[i].minRangeValue, $scope.ranges[i].maxRangeValue);
            delayStatistic.jiraLink = getJiraLink(delayStatistic.entities);
            delayStatistic.count = delayStatistic.entities ? delayStatistic.entities.length : 0;
            leaderDelayStatistics.push(delayStatistic);
        }

        var statistic = {};
        statistic.leader = $scope.isOnlySmeMode ? leaderStatistic.SME :leaderStatistic.leader;
        statistic.delayStatistics = leaderDelayStatistics;

        statistic.total = function (){
            var total = 0;
            for (var index = 0; index < statistic.delayStatistics.length; index++){
                total += statistic.delayStatistics[index].count;
            }

            return total;
        }

        return statistic;
    }

    var getDelayStatisticWithRange = function (leaderStatistic, min, max) {
        var delayStatistics = leaderStatistic.entityDelayStatistics;

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

    $scope.getCommonTotal = function () {
        var total = 0;
        for (var i = 0; i < $scope.statistics.length; i++){
            total += $scope.statistics[i].total();
        }

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