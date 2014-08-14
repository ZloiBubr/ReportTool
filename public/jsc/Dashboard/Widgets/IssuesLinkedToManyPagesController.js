/**
 * Created by Heorhi_Vilkitski on 8/8/2014.
 */

function IssuesLinkedToManyPagesController($scope, $resource, $window, $filter, $modal,  $sce) {
    //var timeSheetDataResource = $resource('/personalData/:from/:to',{from: "@from", to: "@to"});
    //var issueDataResource = $resource('/personalData');

    /* ------------------------------------------------------ Init/Reinit -------------------------------*/
    $scope.init = function () {
        $scope.IssuesLinkedToManyPagesList = [];
        $scope.statuses = new $scope.statuses();
        $scope.$on('issueDataLoaded', $scope.prepareData);

        $scope.nowDate = new Date();
        $scope.nowDate.setHours(12,0,0);

        $scope.TeamFilter = "TeamNova"
    };

    $scope.reInit = function () {
        $scope.prepareData();
    };

    $scope.prepareData = function () {
        console.log($scope.issueData);
        _.each($scope.issueData, function (item) {
            var linkedPagesResult = processLinkedPages(item);
            processLabels(item);
            item.lastDaysAgo = getLastUpdateDays(item);

            item.teamsInvolved = linkedPagesResult.teamsInvolved;
            item.blockersCount = linkedPagesResult.blockersCount;

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


    var processLinkedPages = function(item){
        var result = {
            blockersCount: 0,
            teamsInvolved: []
        };

        _.each(item.linkedPages, function(linkedPageItem){

            // Blockers count calculating
            if(linkedPageItem.linkType.indexOf("blocked") > -1){
                result.blockersCount++;
            }

            // Teams involved in Issue aggregating
            if(!_.find(result.teamsInvolved, function(teamItem){
                return teamItem == linkedPageItem.page.team;
            })){
                result.teamsInvolved.push(linkedPageItem.page.team)
            }
        });

        return result;
    };

    var processLabels = function(item){
        _.each(item.labels, function(labelItem){
            if(labelItem.indexOf("HotIssue") > -1 || labelItem.indexOf("Hotissue") > -1){
                item.isHotIssue = true;
            }
            else if(labelItem.indexOf("F5") > -1 || labelItem.indexOf("F5.") > -1){
                item.isF5Issue = true;
            }
        });
    };

    var getLastUpdateDays = function (item) {
        var itemDate = new Date(item.updated);
        itemDate.setHours(12,0,0);

        return Math.round(($scope.nowDate - itemDate) / 8.64e7);
    };

    /* -------------------------------------------------------Event handlers ------------------------ */
    $scope.onSortingClick = function(sortName){
        if(sortName == $scope.sortingModel.selected){
            $scope.sortingModel.isASC = !$scope.sortingModel.isASC;
        }
        else {
            $scope.sortingModel.selected = sortName;
            $scope.sortingModel.isASC = true;
        }

        $scope.sortBlocksIssues();
    };
    /* --------------------------------------------- Actions ------------------------------*/


    /* ------------------------------------------- DOM/Angular events --------------------------------------*/

    /* ----------------------------------------- Helpers/Angular Filters and etc-----------------------------------*/

    $scope.getBlockersCount = function (item) {
       return _.size(_.filter(item.linkedPages, function (item) {
            return item.linkType.indexOf("blocked") > -1
        }));
    };

    $scope.sortBlocksIssues = function()
    {
       var getter =  $scope.sortingModel[$scope.sortingModel.selected].getter;
       $scope.IssuesLinkedToManyPagesList = $filter('orderBy')($scope.IssuesLinkedToManyPagesList, getter, $scope.sortingModel.isASC);
    };


    $scope.filterBlocksIssues = function (item) {
        if($scope.common.filteredTeam == $scope.allTeams[0].id)
        {
            return true;
        }

        return _.some(item.teamsInvolved, function(team){
            return team == $scope.common.filteredTeam;
        });
    };


    $scope.sortingModel = {
        selected: "blockers",
        isASC : true,

        blockers:{
            getter: function(item){return item.blockersCount;}
        },

        daysAgo:{
            getter: function(item){
                return item.lastDaysAgo;
            }
        },

        assignee:{
            getter: function(item){return item.assignee;}
        }
    };

    $scope.init();
}
