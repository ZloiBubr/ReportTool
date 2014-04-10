/**
 * Created with JetBrains WebStorm.
 * User: Gerd
 * Date: 06.03.14
 * Time: 21:51
 * To change this template use File | Settings | File Templates.
 */
var myApp = angular.module('App', ["ngResource", "highcharts-ng", "ui.router", "ui.bootstrap"]);


function appController($scope, $resource, $window) {
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
}

myApp.run(function ($rootScope, $location) {

})
