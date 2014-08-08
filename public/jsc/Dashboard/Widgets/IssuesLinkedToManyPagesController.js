/**
 * Created by Heorhi_Vilkitski on 8/8/2014.
 */

function IssuesLinkedToManyPagesController($scope, $resource, $window, $filter, $modal,  $sce) {
    //var timeSheetDataResource = $resource('/personalData/:from/:to',{from: "@from", to: "@to"});
    //var issueDataResource = $resource('/personalData');

    /* ------------------------------------------------------ Init/Reinit -------------------------------*/
    $scope.init = function () {

        $scope.IssuesLinkedToManyPagesList = [];
        $scope.$on('issueDataLoaded', $scope.prepareData)
    };

    $scope.reInit = function () {
        $scope.prepareData();
    };

    $scope.prepareData = function () {
        $scope.sortedCollection = $filter('orderBy')($scope.issueData, function (item) {
            return $scope.getBlockersCount(item)
        }, true);
    };

    /* -------------------------------------------------------Event handlers ------------------------ */
    /* --------------------------------------------- Actions ------------------------------*/


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

    $scope.getBlockersCount = function (item) {
       return _.size(_.filter(item.linkedPages, function (item) {
            return item.linkType.indexOf("blocked") > -1
        }));
    }

    $scope.init();
}
