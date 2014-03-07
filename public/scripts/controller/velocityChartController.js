/**
 * Created with JetBrains WebStorm.
 * User: Gerd
 * Date: 06.03.14
 * Time: 21:51
 * To change this template use File | Settings | File Templates.
 */
function velocityChartController($scope, $resource, $window) {
    var jiraApiResource = $resource('https://jira.epam.com/jira/rest/api/2/search');
    var chartSeriesResource = $resource('/velocitydata');

    /* ------------------------------------------------------ Init/Reinit -------------------------------*/
    $scope.init = function () {
        $scope.common = {};
        $scope.common.IsJiraMode = false;
        $scope.common.currentJQL = "project = PLEX-UXC AND Labels in (TeamNova, TeamRenaissance, TeamInspiration) AND Type = Story and Status = Resolved ORDER BY resolutiondate";

        $scope.dataLoad();
    }

    $scope.reInit = function ()
    {
        $scope.dataLoad();
    }

    $scope.dataLoad = function()
    {
        $.when($scope.getReportData())
            .done($scope.initCharts);
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
            series:$scope.common.IsJiraMode ? $scope.getSeries() : $scope.chartsData.data,
            title: {
                text: 'Hello'
            },
            xAxis: {
                type: 'datetime'
            },
            loading: false
        }
    }

    $scope.getSeries = function () {
        var series = [];

        var groupedByLabelTeam = _.groupBy($scope.chartsData.issues, function (item, index) {
            return _.find(item.fields.labels, function (itemLabel) {
                return _.some($scope.jiraLabelsTeams, function (labelType) {
                    return itemLabel === labelType.id;
                });
            });
        });

        _.each(groupedByLabelTeam, function (itemGroupedByLabelTeam,keyLabelTeam) {
            var chartData = [];
            var groupedData = _.groupBy(itemGroupedByLabelTeam, function (item, index) {
                var time = item.fields.customfield_13209 == null && item.fields.resolutiondate
                    ? new Date(item.fields.resolutiondate)
                    : new Date(item.fields.customfield_13209);
                return Date.UTC(time.getFullYear(), time.getMonth(), time.getDay());
            });

            _.each(groupedData, function (grValue, grKey) {
                var storyPointArray = _.reduce(grValue, function (memo, itemValue) {
                    return memo + itemValue.fields.customfield_10004;
                }, 0);
                chartData.push([parseInt(grKey), storyPointArray]);
            });

            chartData = _.sortBy(chartData, function (item) {
                return item[0];
            });
            series.push({
                data:chartData,
                name: keyLabelTeam,
                type: 'line'
            })
        })

        return series;
    }

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

        if($scope.common.isJiraMode === true)
        {
        jiraApiResource.get({
                jql: $scope.common.currentJQL
            },
            getChartSuccess,
            getChartFail);
        }
        else{
            chartSeriesResource.get(getChartSuccess, getChartFail)
        }

        return loadingDfrd.promise();
    }
    /* ------------------------------------------- DOM/Angular events --------------------------------------*/

    $scope.searchIssues = function(){
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

    $scope.init();
}

