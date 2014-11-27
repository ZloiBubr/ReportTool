function versionController($scope, $resource) {
    var versionDataResource = $resource('/versiondata');

    /* ------------------------------------------------------ Init/Reinit -------------------------------*/
    $scope.init = function () {
        $scope.common = {};
        $scope.dataLoad();
    };

    $scope.reInit = function () {
        $scope.dataLoad();
    };

    $scope.dataLoad = function () {
        $scope.getVersionData();
    };

    /* -------------------------------------------------------Event handlers ------------------------ */
    /* --------------------------------------------- Actions ------------------------------*/
    $scope.getVersionData = function () {
        var loadingDfrd = $.Deferred();

        var getVersionSuccess = function (data) {
            $scope.versionData = data;
            var updatedDate = new Date($scope.versionData.version.updated);
            $scope.versionData.version.updatedText = updatedDate.toLocaleString();
            loadingDfrd.resolve();
        };

        var getVersionFail = function (err) {
            $scope.errMessage = err;
            loadingDfrd.reject(err);
        };

        versionDataResource.get($scope.common, getVersionSuccess, getVersionFail);
        return loadingDfrd.promise();
    };



    /* ------------------------------------------- DOM/Angular events --------------------------------------*/

    /* ----------------------------------------- Helpers/Angular Filters and etc-----------------------------------*/


    $scope.init();
}

