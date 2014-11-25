/**
 * Created with JetBrains WebStorm.
 * User: Gerd
 * Date: 06.03.14
 * Time: 21:51
 * To change this template use File | Settings | File Templates.
 */
var myApp = angular.module('App', ["ngResource", "highcharts-ng", "ui.router", "ui.bootstrap","ui.utils", "LocalStorageModule"]);


function appController($scope, $resource, $window) {
    $scope.TeamDevMembers = $window.exports.AllTeams;
    $scope.common = {};

    $scope.log = function (value) {
        $window.console.log(value);
    };

    $scope.isExist = function (item) {
        return angular.isDefined(item);
    };

    $scope.isString = function (item) {
        return _.isString(item);
    };

    $scope.isInt = function (n) {
        return typeof n === 'number' && parseFloat(n) == parseInt(n, 10) && !isNaN(n);
    };

    $scope.allTeams = function () {
        var allTeamsArray = [{"id": "All", "name": "All"}];
        allTeamsArray.push.apply(allTeamsArray,$scope.TeamDevMembers.teams);
        return allTeamsArray;
    }();

    $scope.allStreams = [{id: "All", name: "All"}];
    $scope.allSMEs = [{id: "All", name: "All"}];
    $scope.allModuleGroups = [{id: "All", name: "All"}];
    $scope.allModules = [{id: "All", name: "All"}];
    $scope.allVersions = [{id: "All", name: "All"}];

    $scope.statuses = $window.exports.statuses;
    $scope.STATUS = $window.exports.STATUS;
    $scope.RESOLUTION = $window.exports.RESOLUTION;

    $scope.getPriorityNumber = $window.exports.getPriorityNumber;
}

myApp.run(function ($rootScope, $location) {

});
