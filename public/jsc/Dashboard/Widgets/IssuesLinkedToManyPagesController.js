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

        $scope.TeamFilter = "TeamNova"
    };

    $scope.reInit = function () {
        $scope.prepareData();
    };

    $scope.prepareData = function () {
        _.each($scope.issueData, function (item) {

            var blockersCount = 0;
            var teamsInvolved = [];
            _.each(item.linkedPages, function(linkedPageItem){

                // Blockers count calculating
                if(linkedPageItem.linkType.indexOf("blocked") > -1){
                    blockersCount++;
                }

                // Teams involved in Issue aggregating
                if(!_.find(teamsInvolved, function(teamItem){
                    return teamItem == linkedPageItem.page.team;
                })){
                    teamsInvolved.push(linkedPageItem.page.team)
                }
            });


            item.isHotIssue = _.some(item.labels, function(labelItem){
                return labelItem.indexOf("HotIssue") > -1 || labelItem.indexOf("Hotissue") > -1;
            });

            item.teamsInvolved = teamsInvolved;
            item.blockersCount = blockersCount;

            // filter issues where more than 0 blockers
            if($scope.getBlockersCount(item) > 0) {
                $scope.IssuesLinkedToManyPagesList.push(item);
            }
        }, true);

        // Sorting issues based on blockersCount
        $scope.IssuesLinkedToManyPagesList = $filter('orderBy')($scope.IssuesLinkedToManyPagesList, function (item) {
            return item.blockersCount;
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
