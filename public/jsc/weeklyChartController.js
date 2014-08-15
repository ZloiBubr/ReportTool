/**
 * Created with JetBrains WebStorm.
 * User: Gerd
 * Date: 06.03.14
 * Time: 21:51
 * To change this template use File | Settings | File Templates.
 */
function weeklyChartController($scope, $resource, $window) {
    var velocitySeriesResource = $resource('/weeklydata');

    /* ------------------------------------------------------ Init/Reinit -------------------------------*/
    $scope.init = function () {
        $scope.common = {};

        $scope.dataLoad();
    };

    $scope.reInit = function () {
        $scope.dataLoad();
    };

    $scope.dataLoad = function () {
        $.when($scope.getReportData())
            .done($scope.initCharts);
    };

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
                text: 'Weekly Velocity'
            },
            xAxis: {
                type: 'datetime'
            },
            loading: false
        }
    };

    /* -------------------------------------------------------Event handlers ------------------------ */
    /* --------------------------------------------- Actions ------------------------------*/
    $scope.getReportData = function () {
        var loadingDfrd = $.Deferred();
        var getChartSuccess = function (data) {
            $scope.chartsData = data;
            loadingDfrd.resolve();
        };

        var getChartFail = function (err) {
            $scope.errMessage = err;
            loadingDfrd.reject(err);
        };

        velocitySeriesResource.get(getChartSuccess, getChartFail);
        return loadingDfrd.promise();
    };

    /* ------------------------------------------- DOM/Angular events --------------------------------------*/
    $scope.searchIssues = function () {
        $scope.reInit();
    };

    /* ----------------------------------------- Helpers/Angular Filters and etc-----------------------------------*/
    $scope.jiraLabelsTeams = [
        {"id": "TeamNova", "title": "TeamNova"},
        {"id": "TeamRenaissance", "title": "TeamRenaissance"},
        {"id": "TeamInspiration", "title": "TeamInspiration"},
        {"id": "TeamLiberty", "title": "TeamLiberty"},
        {"id": "TeamViva", "title": "TeamViva"},
        {"id": "Total", "title": "Total"}
    ];

    $scope.init();
}

