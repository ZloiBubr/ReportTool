/**
 * Created by Heorhi_Vilkitski on 4/11/14.
 */

function timeSheetController($scope, $resource, $window, $filter) {
    var timeSheetDataResource = $resource('/timeSheetData/:from/:to',{from: "@from", to: "@to"});

    /* ------------------------------------------------------ Init/Reinit -------------------------------*/
    $scope.init = function () {
        $scope.common = {};
        var fromDate = new Date();
        var monthBackShift = 2;
        var month = (fromDate.getMonth() - monthBackShift) >= 0 ? fromDate.getMonth() - monthBackShift : 12 - (fromDate.getMonth() - monthBackShift);

        fromDate.setMonth(month);
        $scope.from = $filter('date')(fromDate,"yyyy-MM-dd");
        $scope.to = $filter('date')(new Date(),"yyyy-MM-dd");

        $scope.dataLoad();
    };

    $scope.reInit = function () {
        $scope.dataLoad();
    };

    $scope.dataLoad = function () {
        $scope.getTimeSheetData();
    };

    /* -------------------------------------------------------Event handlers ------------------------ */
    /* --------------------------------------------- Actions ------------------------------*/
    $scope.getTimeSheetData = function () {
        var loadingDfrd = $.Deferred();

        var getTimeSheetSuccess = function (data) {
            $scope.timeSheetData = data;
            loadingDfrd.resolve();
        };

        var getTimeSheetFail = function (err) {
            $scope.errMessage = err;
            loadingDfrd.reject(err);
        };

        timeSheetDataResource.get($scope.common, getTimeSheetSuccess, getTimeSheetFail);
    };



    /* ------------------------------------------- DOM/Angular events --------------------------------------*/
    $scope.onDateChange = function()
    {
        $scope.reInit();
    }

    /* ----------------------------------------- Helpers/Angular Filters and etc-----------------------------------*/

    $scope.init();
}

