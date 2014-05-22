/**
 * Created with JetBrains WebStorm.
 * User: Gerd
 * Date: 06.03.14
 * Time: 21:51
 * To change this template use File | Settings | File Templates.
 */
function pagebysizeChartController($scope, $resource, $window) {
    var velocitySeriesResource = $resource('/pagebysizedata');

    /* ------------------------------------------------------ Init/Reinit -------------------------------*/
    $scope.init = function () {
        $scope.common = {};

        $scope.dataLoad();
    }

    $scope.reInit = function () {
        $scope.dataLoad();
    }

    $scope.dataLoad = function () {
        $.when($scope.getReportData())
            .done($scope.initCharts);
    }

    // Original link to use setup chart directive
    // https://github.com/pablojim/highcharts-ng
    $scope.initCharts = function () {
        var chart = new Highcharts.Chart({
            chart: {
                renderTo: 'container',
                type: 'areaspline',
                zoomType: 'x'
            },
            title: {
                text: 'Development Time Spent by Story Size'
            },
            xAxis: {
                type: 'datetime'
            },
            tooltip: {
                formatter: function () {
                    return this.point.tooltip;
                }
            },

            series: $scope.chartsData.data
        });
    }

    /* -------------------------------------------------------Event handlers ------------------------ */
    /* --------------------------------------------- Actions ------------------------------*/
    $scope.getReportData = function () {
        var loadingDfrd = $.Deferred();
        var getChartSuccess = function (data) {
            $scope.chartsData = data;
/*            var avarageSeries = [];
            _.each($scope.chartsData.data, function(itemSeries){
                avarageSeries.push({
                    name: itemSeries.name + ':trend',
                    type: 'line',
                    marker: { enabled: false },
                    data: (function() {
                        return fitData(itemSeries.data).data;
                    })()
                });
            })

            $scope.chartsData.data = _.union($scope.chartsData.data, avarageSeries);
*/            loadingDfrd.resolve();
        };

        var getChartFail = function (err) {
            $scope.errMessage = err;
            loadingDfrd.reject(err);
        };

        velocitySeriesResource.get(getChartSuccess, getChartFail)
        return loadingDfrd.promise();
    }

    /* ------------------------------------------- DOM/Angular events --------------------------------------*/
    $scope.searchIssues = function () {
        $scope.reInit();
    }

    /* ----------------------------------------- Helpers/Angular Filters and etc-----------------------------------*/
    $scope.jiraLabelsTeams = [
        {"id": "XXXL", "title": "XXXL"},
        {"id": "XXL", "title": "XXL"},
        {"id": "ExtraLarge", "title": "ExtraLarge"},
        {"id": "LargePlus", "title": "LargePlus"},
        {"id": "Large", "title": "Large"},
        {"id": "Medium", "title": "Medium"},
        {"id": "Small", "title": "Small"},
    ];

    $scope.init();
}

