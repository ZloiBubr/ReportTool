/**
 * Created with JetBrains WebStorm.
 * User: Gerd
 * Date: 06.03.14
 * Time: 21:51
 * To change this template use File | Settings | File Templates.
 */
var myApp = angular.module('App', ["ngResource", "highcharts-ng", "ui.router", "ui.bootstrap","ui.utils"]);


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

    $scope.allSMEs = [{id: "All", name: "All"}];
    $scope.allModuleGroups = [{id: "All", name: "All"}];
    $scope.allVersions = [{id: "All", name: "All"}];

    $scope.statuses = $window.exports.statuses;
}

myApp.run(function ($rootScope, $location) {

});

Number.prototype.mod = function(n) {
    return ((this%n)+n)%n;
}
Date.prototype.addBusDays = function(dd) {
    var wks = Math.floor(dd/5);
    var dys = dd.mod(5);
    var dy = this.getDay();
    if (dy === 6 && dys > -1) {
        if (dys === 0) {dys-=2; dy+=2;}
        dys++; dy -= 6;}
    if (dy === 0 && dys < 1) {
        if (dys === 0) {dys+=2; dy-=2;}
        dys--; dy += 6;}
    if (dy + dys > 5) dys += 2;
    if (dy + dys < 1) dys -= 2;
    this.setDate(this.getDate()+wks*7+dys);
}
