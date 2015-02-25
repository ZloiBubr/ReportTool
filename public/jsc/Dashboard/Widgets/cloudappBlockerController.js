/**
 * Created by Edhar_Liashok on 10/15/2014.
 */

function cloudAppController($scope, $resource, $window, $filter){
    var cloudAppDataResource = $resource('/cloudappsdata?team=:team', {team: "@filteredTeam", cloudApp: "@cloudAppInput"});

    /* ------------------------------------------------------ Init/Reinit -------------------------------*/

    $scope.init = function () {
//        $scope.common = {
//            allStreams: [{id: "All", name: "All"}]
//        };
        $scope.isEnabled = false;
        $scope.statuses = new $scope.statuses();
        $scope.previousCloud = '';
        $scope.previousCloudSkipped = false;
        $scope.color_codes = {};
        $scope.isShowClosedBlockers = false;

        $scope.$watch('common.filteredTeam', function(newValue, oldValue) {
            if(!_.isUndefined($scope.cloudAddData)){
                $scope.reInit();
            }
        });


        $scope.isLoading = true;

        $scope.dataLoad();
    };

    $scope.predicate = 'appName';

    $scope.reInit = function () {
        $scope.isLoading = true;
        $scope.dataLoad();
    };

    $scope.dataLoad = function () {
        $scope.getCloudAppData();
    };

    /* --------------------------------------------- Actions ------------------------------*/

    $scope.getCloudAppData = function () {
        var loadingDfrd = $.Deferred();

        var getTimeSheetSuccess = function (data) {
            $scope.cloudAddData = data;
            $scope.isLoading = false;
            $scope.isEnabled = true;
            loadingDfrd.resolve();
        };

        var getTimeSheetFail = function (err) {
            $scope.errMessage = err;
            loadingDfrd.reject(err);
        };

            cloudAppDataResource.get(
                {team: $scope.common.filteredTeam == "All" ? undefined : $scope.common.filteredTeam, cloudApp: _.isEmpty($scope.cloudAppInput) ? undefined : $scope.cloudAppInput }, getTimeSheetSuccess, getTimeSheetFail
            );

        return loadingDfrd.promise();
    };

    /* ------------------------------------------- DOM/Angular events --------------------------------------*/

    $scope.onTeamChange = function()
    {
        $scope.onFilterChange();
        $scope.reInit();
    };

    $scope.showCloud = function(cloud){

        if(cloud == $scope.previousCloud){
            $scope.previousCloudSkipped = true;
            return false;
        }

        $scope.previousCloud = cloud;
        $scope.previousCloudSkipped = false;

        return true;
    };

    $scope.getSpan = function(cloudName, rowspans)
    {
        return rowspans[cloudName];
    };

    $scope.stringToColorCode = function(str) {
        return (str in $scope.color_codes) ? $scope.color_codes[str] : ($scope.color_codes[str] = '#'+ ('000000' + (Math.random()*0xFFFFFF<<0).toString(16)).slice(-6));
    };




    $scope.onFilterCloudApps = function(item){
        return $scope.common.filteredStream == "All" ? true : item.stream == $scope.common.filteredStream
    };

    $scope.getBlockerCount = function(blockers){
        var result = 0;
        for(var i=0; i<blockers.length; i++){
            if(blockers[i].status != 'Closed')
                result++;
        }

        return result || "";
    }

    // Edgar please place this to the correct places =)
    $scope.onModalShow = function(){
        $('#cloudAppModal').modal({show:true});
    };

    $scope.onExpand = function(){

    };

    angular.module('ng').filter('allipsis', function () {
        return function (value, wordwise, max, tail) {
            if (!value) return '';

            max = parseInt(max, 10);
            if (!max) return value;
            if (value.length <= max) return value;

            value = value.substr(0, max);
            if (wordwise) {
                var lastspace = value.lastIndexOf(' ');
                if (lastspace != -1) {
                    value = value.substr(0, lastspace);
                }
            }

            return value + (tail || ' …');
        };
    });

    $scope.init();
}
