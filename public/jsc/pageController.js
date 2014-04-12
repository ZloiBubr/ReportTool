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
        $.when($scope.getPageData())
            .done($scope.initCharts);
    }

    $scope.initCharts = function () {

        $scope.chartConfig = {
            options: {
                chart: {
                    type: 'line',
                    zoomType: 'x'
                }
            },
            series: $scope.pageData.pData.series,
            title: {
                text: 'Progress & Time'
            },
            xAxis: {
                type: 'datetime'
            },
            loading: false
        }
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
        return loadingDfrd.promise();
    }

    /* ------------------------------------------- DOM/Angular events --------------------------------------*/
    $scope.searchIssues = function () {
        $scope.reInit();
    }

    /* ----------------------------------------- Helpers/Angular Filters and etc-----------------------------------*/


    $scope.init();
}

