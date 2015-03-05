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

    $scope.allStreams = function () {
        var result = [{"id": "All", "name": "All"}];

        for (var i = 1; i < $scope.allTeams.length; i++) {
            if($scope.allTeams[i].streams) {
                $scope.allTeams[i].streams.forEach(function (item) {
                    result.push({"id": item.replace("Stream", ""), "name": item, "dependencyTeamId":$scope.allTeams[i].id})
                });
            }
        }

        return result;
    }();

    $scope.allSMEs = [{id: "All", name: "All"}];
    $scope.allModuleGroups = [{id: "All", name: "All"}];
    $scope.allModules = [{id: "All", name: "All"}];
    $scope.allVersions = [{id: "All", name: "All"}];

    $scope.statuses = $window.exports.statuses;
    $scope.STATUS = $window.exports.STATUS;
    $scope.RESOLUTION = $window.exports.RESOLUTION;
    $scope.VERSION = $window.exports.VERSION;

    $scope.getPriorityNumber = $window.exports.getPriorityNumber;
}

myApp.run(function ($rootScope, $location) {
    Number.prototype.mod = function(n) {
        return ((this%n)+n)%n;sdlkfj
    };

    Date.prototype.addBusDays = function(dd, holidays) {
        var initialDate = new Date(this);
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

        if(holidays){
            var shiftDaysCount = 0
            _.each(holidays, function(holiday){
                if(
                    (initialDate.getTime() < holiday.getTime() && this.getTime() > holiday.getTime())
                    || initialDate.getTime() === holiday.getTime()
                    || this.getTime() === holiday.getTime())
                {
                    shiftDaysCount++
                }
            }, this);
            if(shiftDaysCount > 0){
                this.addBusDays(shiftDaysCount,holidays);
            }
        }

        return this;
    }
});
