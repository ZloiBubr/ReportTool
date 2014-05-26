/**
 * Created by Heorhi_Vilkitski on 4/11/14.
 */

function timeSheetController($scope, $resource, $window, $filter, $modal,  $sce) {
    //var timeSheetDataResource = $resource('/personalData/:from/:to',{from: "@from", to: "@to"});
    var timeSheetDataResource = $resource('/personalData');

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
            $scope.personalData = data;
            loadingDfrd.resolve();
        };

        var getTimeSheetFail = function (err) {
            $scope.errMessage = err;
            loadingDfrd.reject(err);
        };

        //timeSheetDataResource.get($scope.common, getTimeSheetSuccess, getTimeSheetFail);
        timeSheetDataResource.get(getTimeSheetSuccess, getTimeSheetFail);
    };



    /* ------------------------------------------- DOM/Angular events --------------------------------------*/
    $scope.onDateChange = function()
    {
        $scope.reInit();
    }

    $scope.onCellClick = function(item) {

        var modalInstance = $modal.open({
            templateUrl: '/pages/modal/timeSheetPageModal.html',
            controller: timeSheetPageModalController,
            size: "sm",
            resolve: {
                item: function () {
                    return item;
                }
            }
        });
    }

    /* ----------------------------------------- Helpers/Angular Filters and etc-----------------------------------*/

    $scope.toFloat = function(item){
        return parseFloat(item);
    };

    $scope.getDeveloperTimeSheetLink = function(developerName){
        var firstLastNameList = developerName.split(" ");
        return "https://jira.epam.com/jira/secure/TempoUserBoard!timesheet.jspa?userId=" + firstLastNameList[0] + "_" + firstLastNameList[1];
    }

    $scope.getDeveloperIndexNotEmpty = function(developers) {

        for (var i = 0; i < developers.length; i++) {
            if (developers[i].progressDetails.length && developers[i].progressDetails.length > 0)
                return i

        }
        return 0;
    }

    $scope.getCellHrSpString = function(progressDetail){
        var totalSP =  $filter('number')(parseFloat(progressDetail.totalSP), 2);
        var totalHR = progressDetail.totalHR

        if(totalSP == 0 && totalHR == 0){
           return $sce.trustAsHtml("-");
        }
//
//        if(totalSP > 0 && totalHR == 0) {
//            return  "-(" + totalSP + "sp)";
//        }
//
//        if(totalSP == 0 && totalHR > 0) {
//            return  totalHR + "h(-sp)";
//        }

        return $sce.trustAsHtml("<span class='hour-timesheet-color'>" +  totalHR + "</span>" + "<sup style='color:black'>" + totalSP + "</sup>");
    }

    $scope.isWeekend = function(progressDetail){
        var day = (new Date(progressDetail.date)).getDay();
        return day == 6 || day == 0;
    }



    $scope.init();
}

function timeSheetPageModalController($scope,$modalInstance, item ) {
    $scope.selectedProgressDetail = item;

    $scope.onOkClick = function (){
        $modalInstance.close($scope.selectedProgressDetail);
    }
}

