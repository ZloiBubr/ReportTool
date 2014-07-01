/**
 * Created by Heorhi_Vilkitski on 4/11/14.
 */

function waveProgressController($scope, $resource, $window, $filter) {
    var timeSheetDataResource = $resource('/wavedata');

    /* ------------------------------------------------------ Init/Reinit -------------------------------*/
    $scope.init = function () {
        $scope.common = {};
        $scope.dataLoad();
    };

    $scope.reInit = function () {
        $scope.dataLoad();
    };

    $scope.dataLoad = function () {
        $scope.filteredTeam = $scope.allTeams[0].id;
        $scope.isTotalWasCalculated = false;

        $scope.total = new $scope.statuses();
        $scope.total.all = {isChecked :true};
        $scope.total.total = 0;
        $scope.getTimeSheetData().done($scope.processWithRowSpans);
    };

    $scope.processWithRowSpans = function () {
        $scope.invertedWaveProgressData=[];

        _.each($scope.waveProgressData.waves, function(waveProgressItem){
            var firstWaveIndex = $scope.invertedWaveProgressData.length;
            waveProgressItem.rowSpan = _.reduce(waveProgressItem.moduleGroup, function(moduleGroupMemo, moduleGroupItem){
                var firstModuleGroupIndex = $scope.invertedWaveProgressData.length;
                moduleGroupItem.rowSpan = _.reduce(moduleGroupItem.module, function(moduleMemo, moduleItem){
                        var firstCloudAppIndex = $scope.invertedWaveProgressData.length;
                        moduleItem.rowSpan = _.reduce(moduleItem.cloudApp, function(cloudAppMemo, cloudAppItem){
                            var statusEntity = $scope.total.getStatusByName(cloudAppItem.status);
                            $scope.isTotalWasCalculated ? void(0) : statusEntity.count++;
                            $scope.isTotalWasCalculated ? void(0) : $scope.total.total++;

                            if($scope.filteredTeam != $scope.allTeams[0].id && cloudAppItem.teamName != $scope.filteredTeam){
                                return cloudAppMemo;
                            }

                            if(statusEntity.isChecked)
                            {
                                $scope.invertedWaveProgressData.push({appItem: cloudAppItem});
                                cloudAppItem.progress == 100 ? $scope.total.complete++ : void(0);
                                return cloudAppMemo + 1;
                            }

                            return cloudAppMemo;
                        },0);

                    if(_.isUndefined($scope.invertedWaveProgressData[firstCloudAppIndex])){
                        return moduleMemo;
                    }

                    $scope.invertedWaveProgressData[firstCloudAppIndex].module = moduleItem;
                        return moduleMemo + moduleItem.rowSpan;
                },0);


                if(_.isUndefined($scope.invertedWaveProgressData[firstModuleGroupIndex])){
                    return moduleGroupMemo;
                }

                $scope.invertedWaveProgressData[firstModuleGroupIndex].moduleGroup = moduleGroupItem;
                return moduleGroupMemo + moduleGroupItem.rowSpan;
            }, 0);

            if(!_.isUndefined($scope.invertedWaveProgressData[firstWaveIndex])){
                $scope.invertedWaveProgressData[firstWaveIndex].wave = waveProgressItem;
            }
        });
        $scope.isTotalWasCalculated = true;
    };

    /* -------------------------------------------------------Event handlers ------------------------ */
    /* --------------------------------------------- Actions ------------------------------*/
    $scope.getTimeSheetData = function () {
        var loadingDfrd = $.Deferred();

        var getTimeSheetSuccess = function (data) {
            $scope.waveProgressData = data;
            loadingDfrd.resolve();
        };

        var getTimeSheetFail = function (err) {
            $scope.errMessage = err;
            loadingDfrd.reject(err);
        };

        timeSheetDataResource.get($scope.common, getTimeSheetSuccess, getTimeSheetFail);
        return loadingDfrd.promise();
    };



    /* ------------------------------------------- DOM/Angular events --------------------------------------*/
    $scope.onDateChange = function()
    {
        $scope.reInit();
    }

    $scope.onSelectDeselectAll = function()
    {
        $scope.total.open.isChecked = $scope.total.all.isChecked;
        $scope.total.assigned.isChecked = $scope.total.all.isChecked;
        $scope.total.inProgress.isChecked = $scope.total.all.isChecked;
        $scope.total.codeReview.isChecked = $scope.total.all.isChecked;
        $scope.total.accepted.isChecked = $scope.total.all.isChecked;
        $scope.total.readyForQA.isChecked = $scope.total.all.isChecked;
        $scope.total.testingInProgress.isChecked = $scope.total.all.isChecked;
        $scope.total.resolved.isChecked = $scope.total.all.isChecked;
        $scope.total.blocked.isChecked = $scope.total.all.isChecked;
        $scope.total.deferred.isChecked = $scope.total.all.isChecked;

        $scope.processWithRowSpans();
    }

    /* ----------------------------------------- Helpers/Angular Filters and etc-----------------------------------*/


    $scope.filterCloudAppByStatus = function(item)
    {
        return $scope.getStatusEntity(item.appItem.status).isChecked;
    }

    $scope.isUnknownExist = function(item)
    {
        return item.indexOf("Unknown") > -1;
    }


    $scope.init();
}

