function pageController($scope, $resource, $window, $location,$stateParams) {
    var pageResource = $resource('/pagedata/:pageid',{ pageid : "@pageid" });
$scope.jiraId = $stateParams.id;

    /* ------------------------------------------------------ Init/Reinit -------------------------------*/
    $scope.init = function () {
        $scope.common = {};

        $scope.dataLoad();
    };;

    $scope.reInit = function () {
        $scope.dataLoad();
    };;

    $scope.dataLoad = function () {
        $.when($scope.getPageData())
            .done($scope.initCharts);
    };

    $scope.initCharts = function () {
        $('#container').highcharts({
            chart: {
                type: 'line',
                zoomType: 'x'
            },
            title: {
                text: 'Progress & Time',
                x: -20 //center
            },
            subtitle: {
                text: 'Source: jira.epam.com',
                x: -20
            },
            xAxis: {
                type: 'datetime'
            },
            plotOptions: {
                line: {
                    dataLabels: {
                        enabled: false
                    },
                    enableMouseTracking: true
                }
            },
            yAxis: {
                title: {
                    text: 'Progress & Time'
                },
                plotLines: [{
                    value: 0,
                    width: 1,
                    color: '#808080'
                }]
            },
            tooltip: {
                valueSuffix: ''
            },
            legend: {
                layout: 'horizontal',
                align: 'bottom',
                verticalAlign: 'bottom',
                borderWidth: 0
            },
            series: $scope.pageData.pData.series
        });
    };

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
        pageResource.get({pageid: $scope.jiraId }, getPageSuccess, getPageFail);
        return loadingDfrd.promise();
    };

    /* ------------------------------------------- DOM/Angular events --------------------------------------*/
    $scope.searchIssues = function () {
        $scope.reInit();
    };

    /* ----------------------------------------- Helpers/Angular Filters and etc-----------------------------------*/


    $scope.init();
}

