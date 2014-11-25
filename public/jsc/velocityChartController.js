/**
 * Created with JetBrains WebStorm.
 * User: Gerd
 * Date: 06.03.14
 * Time: 21:51
 * To change this template use File | Settings | File Templates.
 */
function velocityChartController($scope, $resource, $window) {
    var velocitySeriesResource = $resource('/velocitydata');

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

    $scope.initCharts = function () {
        $('#container').highcharts({
            chart: {
                type: 'line',
                zoomType: 'x'
            },
            title: {
                text: 'Burndown',
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
                    text: 'Velocity (Story Points)'
                },
                plotLines: [{
                    value: 0,
                    width: 1,
                    color: '#808080'
                }]
            },
            tooltip: {
                formatter: function () {
                    if(this.point.tooltip == "") {
                        return (new Date(this.x)).toDateString() + ":" + this.y;
                    }
                    var modules = this.point.tooltip ? this.point.tooltip.split(",") : [];
                    var result = "";
                    for(var i=0; i<modules.length; i++) {
                        result += modules[i] + '<br/>';
                    }
                    return result;
                }
            },
            legend: {
                layout: 'horizontal',
                align: 'bottom',
                verticalAlign: 'bottom',
                borderWidth: 0
            },
            series: $scope.chartsData.data
        });
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
        {"id": "TeamViva", "title": "TeamViva"}
    ];

    $scope.init();
}

