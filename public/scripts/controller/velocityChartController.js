/**
 * Created with JetBrains WebStorm.
 * User: Gerd
 * Date: 06.03.14
 * Time: 21:51
 * To change this template use File | Settings | File Templates.
 */
function velocityChartController($scope, $resource, $window) {
    var velocitySeriesResource = $resource('/velocitydata');
    var progressSeriesResource = $resource('/progressdata');

    /* ------------------------------------------------------ Init/Reinit -------------------------------*/
    $scope.init = function () {
        $scope.common = {};
        $scope.common.viewType = $scope.viewTypes[0].id; // progress

        $scope.dataLoad();
    }

    $scope.reInit = function () {
        $scope.dataLoad();
    }

    $scope.dataLoad = function () {
        switch ($scope.common.viewType) {
            case $scope.viewTypes[1].id: // velocity
                $.when($scope.getReportData())
                    .done($scope.initCharts);
                break;
            case $scope.viewTypes[0].id:// progress
            default:
                $scope.getReportData();
        }
    }

    // Original link to use setup chart directive
    // https://github.com/pablojim/highcharts-ng
    $scope.initCharts = function () {

        $scope.chartConfig = {
            options: {
                chart: {
                    type: 'line',
                    zoomType: 'x'
                }
            },
            series: $scope.chartsData.data,
            title: {
                text: 'Hello'
            },
            xAxis: {
                type: 'datetime'
            },
            loading: false
        }
    }

    /* -------------------------------------------------------Event handlers ------------------------ */
    /* --------------------------------------------- Actions ------------------------------*/
    $scope.getReportData = function () {
        var loadingDfrd = $.Deferred();
        var getChartSuccess = function (data) {
            $scope.chartsData = data;
            loadingDfrd.resolve();
        };

        var getProgressSuccess = function (data) {
            $scope.progressData = data;
        };

        var getChartFail = function (err) {
            $scope.errMessage = err;
            loadingDfrd.reject(err);
        };

        switch ($scope.common.viewType) {
            case $scope.viewTypes[0].id: // progress
                progressSeriesResource.get(getProgressSuccess, getChartFail)
                break;
            case $scope.viewTypes[1].id: // velocityModel
                velocitySeriesResource.get(getChartSuccess, getChartFail)
                return loadingDfrd.promise();
        }
    }
    /* ------------------------------------------- DOM/Angular events --------------------------------------*/

    $scope.searchIssues = function () {
        $scope.reInit();
    }
    /* ----------------------------------------- Helpers/Angular Filters and etc-----------------------------------*/
    $scope.dashStyles = [
        {"id": "Solid", "title": "Solid"},
        {"id": "ShortDash", "title": "ShortDash"},
        {"id": "ShortDot", "title": "ShortDot"},
        {"id": "ShortDashDot", "title": "ShortDashDot"},
        {"id": "ShortDashDotDot", "title": "ShortDashDotDot"},
        {"id": "Dot", "title": "Dot"},
        {"id": "Dash", "title": "Dash"},
        {"id": "LongDash", "title": "LongDash"},
        {"id": "DashDot", "title": "DashDot"},
        {"id": "LongDashDot", "title": "LongDashDot"},
        {"id": "LongDashDotDot", "title": "LongDashDotDot"}
    ];

    $scope.chartTypes = [
        {"id": "line", "title": "Line"},
        {"id": "spline", "title": "Smooth line"},
        {"id": "area", "title": "Area"},
        {"id": "areaspline", "title": "Smooth area"},
        {"id": "column", "title": "Column"},
        {"id": "bar", "title": "Bar"},
        {"id": "pie", "title": "Pie"},
        {"id": "scatter", "title": "Scatter"}
    ];

    $scope.jiraLabelsTeams = [
        {"id": "TeamNova", "title": "TeamNova"},
        {"id": "TeamRenaissance", "title": "TeamRenaissance"},
        {"id": "TeamInspiration", "title": "TeamInspiration"}
    ];


    $scope.viewTypes = [
        {"id": "Progress", "title": "Team Progress"},
        {"id": "Velocity", "title": "Team Velocity"},
    ];

    $scope.init();
}

