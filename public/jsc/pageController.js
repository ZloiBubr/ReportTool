function pageController($scope, $resource, $window, $location,$stateParams) {
    var pageResource = $resource('/pagedata/:pageid',{ pageid : "@pageid" });
$scope.jiraId = $stateParams.id;

    /* ------------------------------------------------------ Init/Reinit -------------------------------*/
    $scope.init = function () {
        $scope.common = {};

        $scope.dataLoad();
    }

    $scope.reInit = function () {
        $scope.dataLoad();
    }

    $scope.dataLoad = function () {
        $scope.getPageData();
    }

    /* -------------------------------------------------------Event handlers ------------------------ */
    /* --------------------------------------------- Actions ------------------------------*/
    $scope.getPageData = function () {
        var loadingDfrd = $.Deferred();

        var getPageSuccess = function (data) {
            $scope.pageData = data;
            loadingDfrd.resolve();
        };

        var getPageFail = function (err) {
            $scope.errMessage = err;
            loadingDfrd.reject(err);
        };

        var id = location.search.replace("?id=",'');
        pageResource.get({pageid: $scope.jiraId }, getPageSuccess, getPageFail)
    }

    /* ------------------------------------------- DOM/Angular events --------------------------------------*/
    $scope.searchIssues = function () {
        $scope.reInit();
    }

    /* ----------------------------------------- Helpers/Angular Filters and etc-----------------------------------*/


    $scope.init();
}

