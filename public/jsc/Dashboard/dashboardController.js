/**
 * Created by Heorhi_Vilkitski on 8/5/2014.
 */

function dashboardController($scope, $resource, $window, $filter, $modal,  $sce, $timeout) {
    //var timeSheetDataResource = $resource('/personalData/:from/:to',{from: "@from", to: "@to"});
    var issueDataResource = $resource('/issuesData');

    /* ------------------------------------------------------ Init/Reinit -------------------------------*/
    $scope.init = function () {
        $scope.common = {};
        $scope.common.filteredTeam = $scope.allTeams[0].id;
        $scope.isLoading = true;

        $scope.dataLoad();
    };

    $scope.reInit = function () {
        $scope.isLoading = true;
        $scope.dataLoad();
    };

    $scope.dataLoad = function () {
        $scope.getDashboardData();
    };

    /* -------------------------------------------------------Event handlers ------------------------ */
    /* --------------------------------------------- Actions ------------------------------*/
    $scope.getDashboardData = function () {
        var loadingDfrd = $.Deferred();

        var getIssueSuccess = function (data) {
            $scope.issueData = data;
            loadingDfrd.resolve();
            $scope.$broadcast('issueDataLoaded');
            $scope.isLoading = false;
        };

        var getIssueFail = function (err) {
            $scope.errMessage = err;
            loadingDfrd.reject(err);
        };

        issueDataResource.query(getIssueSuccess, getIssueFail);
    };



    /* ------------------------------------------- DOM/Angular events --------------------------------------*/
//    $scope.onDateChange = function()
//    {
//        $scope.reInit();
//    }
//
//    $scope.onCellClick = function(item) {
//
//        var modalInstance = $modal.open({
//            templateUrl: '/pages/modal/timeSheetPageModal.html',
//            controller: timeSheetPageModalController,
//            size: "sm",
//            resolve: {
//                item: function () {
//                    return item;
//                }
//            }
//        });
//    }

    /* ----------------------------------------- Helpers/Angular Filters and etc-----------------------------------*/

    $timeout(function(){
        $scope.init();
    });
}
