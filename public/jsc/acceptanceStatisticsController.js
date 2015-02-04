function acceptanceStatisticsController($scope, $resource) {
    var resource = $resource('/acceptanceStatistics');

    $scope.init = function () {
        $scope.loadData();
    }

    $scope.loadData = function () {
        var deferred = $.Deferred();

        var successCallback = function (data) {
            $scope.cloudApps = data.cloudApps;
            deferred.resolve();
        };

        var errorCallback = function (err) {
            $scope.errMessage = err;
            deferred.reject(err);
        };

        resource.get(successCallback, errorCallback);
    }

    $scope.init();
}