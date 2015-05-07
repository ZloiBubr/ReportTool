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
        $scope.tabledata = [];

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
        $('#container').highcharts({
            chart: {
                type: 'areaspline',
                zoomType: 'x'
            },
            title: {
                text: 'Hours per Page',
                x: -20 //center
            },
            subtitle: {
                text: 'Source: jira.epam.com',
                x: -20
            },
            xAxis: {
                type: 'datetime'
            },
            yAxis: {
                title: {
                    text: 'Development effort (Hours)'
                },
                plotLines: [{
                    value: 0,
                    width: 1,
                    color: '#808080'
                }]
            },
            tooltip: {
                formatter: function () {
                    return this.point.tooltip;
                }
            },
            legend: {
                layout: 'vertical',
                align: 'right',
                verticalAlign: 'center',
                borderWidth: 0
            },
            turboThreshold: 0,
            series: $scope.chartsData.data
        });
    };

    /* -------------------------------------------------------Event handlers ------------------------ */
    /* --------------------------------------------- Actions ------------------------------*/
    $scope.getReportData = function () {
        var loadingDfrd = $.Deferred();
        var getChartSuccess = function (data) {
            $scope.chartsData = data;
            var averageSeries = [];
            _.each($scope.chartsData.data, function(itemSeries){
                averageSeries.push({
                    name: itemSeries.name + ':trend',
                    type: 'line',
                    marker: { enabled: false },
                    visible: itemSeries.name == 'SmallDev' ? true : false,
                    data: (function() {
                        return itemSeries.data.length > 1 ? fitData(itemSeries.data).data : itemSeries.data;
                    })()
                });
                $scope.tabledata.push($scope.getSizeData(itemSeries));
            });

            $scope.chartsData.data = _.union($scope.chartsData.data, averageSeries);
            loadingDfrd.resolve();
        };

        var getChartFail = function (err) {
            $scope.errMessage = err;
            loadingDfrd.reject(err);
        };

        velocitySeriesResource.get(getChartSuccess, getChartFail);
        return loadingDfrd.promise();
    };

    $scope.getSizeData = function (series) {
        var sizeObj = {};
        sizeObj.name = series.name;
        sizeObj.min = 1000.;
        sizeObj.max = 0.;
        sizeObj.avg = 0.;
        sizeObj.count = 0;
        for(var i=0; i<series.data.length; i++) {
            sizeObj.count++;
            var y = series.data[i].y;
            if(sizeObj.min > y) {
                sizeObj.min = y;
            }
            if(sizeObj.max < y) {
                sizeObj.max = y;
            }
            sizeObj.avg += y;
        }
        sizeObj.avg = sizeObj.avg/sizeObj.count;
        return sizeObj;
    };
    /* ------------------------------------------- DOM/Angular events --------------------------------------*/
    $scope.searchIssues = function () {
        $scope.reInit();
    };

    /* ----------------------------------------- Helpers/Angular Filters and etc-----------------------------------*/
    $scope.init();
}

