/**
 * Created by Heorhi_Vilkitski on 4/11/14.
 */

function timeSheetController($scope, $resource, $window, $filter, $modal,  $sce) {
    //var timeSheetDataResource = $resource('/personalData/:from/:to',{from: "@from", to: "@to"});
    var timeSheetDataResource = $resource('/personalData/:fromDate/:toDate', {fromDate: "@from", toDate: "@to"});

    /* ------------------------------------------------------ Init/Reinit -------------------------------*/
    $scope.init = function () {
        $scope.common = {};
        var fromQuery = new Date();
        var toQuery = new Date();
        var daysBackShift = 14;
        $scope.isLoading = true;
        //var monthBackShift = 2;
        //var month = ($scope.fromQuery.getMonth() - monthBackShift) >= 0 ? $scope.fromQuery.getMonth() - monthBackShift : 12 - ($scope.fromQuery.getMonth() - monthBackShift);
        //$scope.fromQuery.setMonth(month);

        fromQuery.setDate(fromQuery.getDate()-daysBackShift);

        $scope.from = $filter('date')(fromQuery,"yyyy-MM-dd");
        $scope.to = $filter('date')(toQuery,"yyyy-MM-dd");

        $scope.dataLoad();
    };

    $scope.reInit = function () {
        $scope.isLoading = true;
        $scope.isShowOnlyTotal = true;
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
            $scope.isLoading = false;
            loadingDfrd.resolve();
        };

        var getTimeSheetFail = function (err) {
            $scope.errMessage = err;
            loadingDfrd.reject(err);
        };

        //timeSheetDataResource.get($scope.common, getTimeSheetSuccess, getTimeSheetFail);
        timeSheetDataResource.get({fromDate: $scope.from, toDate: $scope.to}, getTimeSheetSuccess, getTimeSheetFail);
    };



    /* ------------------------------------------- DOM/Angular events --------------------------------------*/
    $scope.onDateChange = function()
    {
        $scope.reInit();
    };

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
    };

    /* ----------------------------------------- Helpers/Angular Filters and etc-----------------------------------*/

    $scope.getTotal = function(date, developers){
        var total = 0;

        for (var i = 0; i < developers.length; i++) {
            for(var j = 0; j < developers[i].progressDetails.length; j++)
            {
                if(developers[i].progressDetails[j].date == date)
                {
                    total += developers[i].progressDetails[j].totalSP;
                }
            }
        }

        return total;
    };

    $scope.predicate = 'name';

    $scope.toFloat = function(item){
        return parseFloat(item);
    };

    $scope.getDeveloperTimeSheetLink = function(developerName){
        var firstLastNameList = developerName.split(" ");
        return "https://jira.epam.com/jira/secure/TempoUserBoard!timesheet.jspa?userId=" + firstLastNameList[0] + "_" + firstLastNameList[1];
    };

    $scope.getDeveloperIndexNotEmpty = function(developers) {

        for (var i = 0; i < developers.length; i++) {
            if (developers[i].progressDetails.length && developers[i].progressDetails.length > 0)
                return i

        }
        return 0;
    };

    $scope.filterExcludeAutomation  = function() {
        return function(item)
        {
            return item.name !== "Automation";
        }
    };

    $scope.getCellHrSpString = function(progressDetail){
        var totalSP =  $filter('number')(parseFloat(progressDetail.totalSP), 2);
        var totalHR = $filter('number')(parseFloat(progressDetail.totalHR), 2);

        if(totalSP == 0 && totalHR == 0){
           return $sce.trustAsHtml("-");
        }

        return $sce.trustAsHtml("<span class='hour-timesheet-color'>" +  totalHR + "</span>" + "<sup style='color:black'>" + totalSP + "</sup>");
    };

    $scope.isWeekend = function(progressDetail){
        var day = (new Date(progressDetail.date)).getDay();
        return day == 6 || day == 0;
    };



    $scope.init();
}

function timeSheetPageModalController($scope,$modalInstance, item ) {
    $scope.selectedProgressDetail = item;

    $scope.onOkClick = function (){
        $modalInstance.close($scope.selectedProgressDetail);
    }
}

