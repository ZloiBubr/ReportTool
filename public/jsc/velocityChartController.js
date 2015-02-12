/**
 * Created with JetBrains WebStorm.
 * User: Gerd
 * Date: 06.03.14
 * Time: 21:51
 * To change this template use File | Settings | File Templates.
 */
function velocityChartController($scope, $resource, $modal, $timeout, $window) {
    var velocitySeriesResource = $resource('/velocitydata');

    /* ------------------------------------------------------ Init/Reinit -------------------------------*/
    $scope.init = function () {
        $scope.common = {};
        $scope.isExtendView = false;
        $scope.extendModel = { data:[] };
        $scope.currentDate = new Date();

        $scope.dataLoad();
    };

    $scope.reInit = function () {
        $timeout(function () {
        $scope.initCharts();
        });
    };

    $scope.dataLoad = function () {
        $.when($scope.getReportData())
            .done($scope.initCharts);
    };

    $scope.initCharts = function () {
        var totalClosedResult = getClosedAmount();

        $('#stacked_container').highcharts({
            chart: {
                type: 'bar'
            },
            title: {
                text: 'Distribution by page status, closed ' + totalClosedResult.pages.closed + ' from ' + totalClosedResult.pages.total + ' or ' + totalClosedResult.pages.closedPercents + '%'
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
            series: $scope.pagesModel.data
        });

         if($scope.isExtendView){
            $('#stacked_container_sp').highcharts({
                chart: {
                    type: 'bar'
                },
                title: {
                    text: 'Distribution by SP status, closed ' + totalClosedResult.sp.closed + ' from ' + totalClosedResult.sp.total + ' or ' + totalClosedResult.sp.closedPercents + '%'
                },
                xAxis: {
                    categories: ['SP']
                },
                yAxis: {
                    min: 0,
                    title: {
                        text: 'Total SP distribution'
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
                series: $scope.spModel.data
            });
        }

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
            $scope.distributionByTeam = data.distributionByTeam;

            $scope.pagesModel = {data:[]};
            $scope.spModel = {data:[]};

            _.forEach($scope.distributionoData.data, function(item){
                $scope.pagesModel.data.push({
                    name: item.name,
                    data: [item.data[0]]
                });

                $scope.spModel.data.push({
                    name: item.name,
                    data: [item.data[1]]
                });
            });

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
            size: "sm"
        });
    };

    function getClosedAmount(){
        var result = {
            pages:{
                total: 0,
                closed: 0,
                closedPercents: 0
            },
            sp:{
                total: 0,
                closed: 0,
                closedPercents: 0
            }
        };

        for(var i=0; i<$scope.distributionoData.data.length; i++)
        {
            if($scope.distributionoData.data[i].name == $scope.STATUS.CLOSED.name ||
                $scope.distributionoData.data[i].name == $scope.STATUS.PRODUCTION.name){
                result.pages.closed += $scope.distributionoData.data[i].data[0];
                result.sp.closed += $scope.distributionoData.data[i].data[1];
            }

            result.pages.total += $scope.distributionoData.data[i].data[0];
            result.sp.total += $scope.distributionoData.data[i].data[1];
        }

        result.pages.closedPercents = ((result.pages.closed * 100) / result.pages.total).toFixed(1);
        result.sp.closedPercents = ((result.sp.closed * 100) / result.sp.total).toFixed(1);
        return result;
    }

    /* ------------------------------------------- DOM/Angular events --------------------------------------*/

    /* ----------------------------------------- Helpers/Angular Filters and etc-----------------------------------*/
    $scope.init();
}

function copyPasteModalController($scope, $window, $modalInstance) {

    function copyFunc(ev){
        var table_txt = document.getElementById('copyStackedTable').outerHTML;
        ev.clipboardData.setData('text', table_txt);
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

