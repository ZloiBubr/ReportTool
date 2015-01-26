/**
 * Created with JetBrains WebStorm.
 * User: Gerd
 * Date: 06.03.14
 * Time: 21:51
 * To change this template use File | Settings | File Templates.
 */
function velocityChartController($scope, $resource,$modal, $window) {
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
        $('#stacked_container').highcharts({
            chart: {
                type: 'bar'
            },
            title: {
                text: 'Distribution by page status'
            },
            xAxis: {
                categories: ['Pages']
            },
            yAxis: {
                min: 0,
                title: {
                    text: 'Total pages distribution'
                }
            },
            legend: {
                reversed: true
            },
            plotOptions: {
                series: {
                    stacking: 'normal'
                }
            },
            series: $scope.distributionoData.data
        });

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
            $scope.distributionoData = data.distribution;
            loadingDfrd.resolve();
        };

        var getChartFail = function (err) {
            $scope.errMessage = err;
            loadingDfrd.reject(err);
        };

        velocitySeriesResource.get(getChartSuccess, getChartFail);
        return loadingDfrd.promise();
    };

    $scope.onCopyModalShow = function(){
        var modalInstance = $modal.open({
            templateUrl: '/pages/modal/copyPasteModal.html',
            controller: copyPasteModalController,
            size: "sm"//,
//            resolve: {
//                item: function () {
//                    return item;
//                }
//            }
        });
    };

    /* ------------------------------------------- DOM/Angular events --------------------------------------*/
    $scope.searchIssues = function () {
        $scope.reInit();
    };

    /* ----------------------------------------- Helpers/Angular Filters and etc-----------------------------------*/
    $scope.init();
}

function copyPasteModalController($scope, $window, $modalInstance) {

    function copyFunc(ev){
        console.log('copy event');
        // you can set clipboard data here, e.g.
        var table_txt = document.getElementById('copyStackedTable').outerHTML;
        ev.clipboardData.setData('text', table_txt);
        // you need to prevent default behaviour here, otherwise browser will overwrite your content with currently selected
        ev.preventDefault();

        $scope.unsubscribeCopyHandler();
        $scope.cancel();
    }


    $scope.cancel = function (){
        $modalInstance.close();
    };

    $scope.unsubscribeCopyHandler = function(){
        $window.removeEventListener('copy', copyFunc);
    };

    $scope.subscribeCopyHandler = function(){
        $window.addEventListener('copy', copyFunc);
    };

    $scope.subscribeCopyHandler();
}

