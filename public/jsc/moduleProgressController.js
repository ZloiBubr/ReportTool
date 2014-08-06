/**
 * Created by Heorhi_Vilkitski on 4/11/14.
 */

function moduleProgressController($scope, $resource, $window, $filter) {
    var moduleDataResource = $resource('/moduledata');

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
        $scope.reInitTotal();
        $scope.getModuleData().done($scope.processWithRowSpans);
    };

    $scope.reInitTotal = function(){
        $scope.total = new $scope.statuses();
        $scope.total.all = {isChecked :true};
        $scope.total.total = 0;
        $scope.total.pages = 0;
    }

    $scope.processWithRowSpans = function () {
        $scope.total.pages = 0;
        $scope.invertedModuleProgressData=[];

        _.each($scope.moduleProgressData.moduleGroup, function(moduleGroupItem){
            var firstWaveIndex = $scope.invertedModuleProgressData.length;
            waveProgressItem.rowSpan = _.reduce(waveProgressItem.moduleGroup, function(moduleGroupMemo, moduleGroupItem){
                var firstModuleGroupIndex = $scope.invertedModuleProgressData.length;
                moduleGroupItem.rowSpan = _.reduce(moduleGroupItem.module, function(moduleMemo, moduleItem){
                    var firstCloudAppIndex = $scope.invertedModuleProgressData.length;
                    moduleItem.rowSpan = _.reduce(moduleItem.cloudApp, function(cloudAppMemo, cloudAppItem){
                        var statusEntity = $scope.total.getStatusByName(cloudAppItem.status);

                        if($scope.filteredTeam != $scope.allTeams[0].id && cloudAppItem.teamName != $scope.filteredTeam){
                            return cloudAppMemo;
                        }

                        $scope.isTotalWasCalculated ? void(0) : statusEntity.count++;
                        $scope.isTotalWasCalculated ? void(0) : $scope.total.total++;

                        if(statusEntity.isChecked)
                        {
                            $scope.total.pages += cloudAppItem.pages;
                            $scope.invertedModuleProgressData.push({appItem: cloudAppItem});
                            cloudAppItem.progress == 100 ? $scope.total.complete++ : void(0);
                            return cloudAppMemo + 1;
                        }

                        return cloudAppMemo;
                    },0);

                    if(_.isUndefined($scope.invertedModuleProgressData[firstCloudAppIndex])){
                        return moduleMemo;
                    }

                    $scope.invertedModuleProgressData[firstCloudAppIndex].module = moduleItem;
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
    $scope.getModuleData = function () {
        var loadingDfrd = $.Deferred();

        var getModuleSuccess = function (data) {
            $scope.moduleProgressData = data;
            loadingDfrd.resolve();
        };

        var getModuleFail = function (err) {
            $scope.errMessage = err;
            loadingDfrd.reject(err);
        };

        moduleDataResource.get($scope.common, getModuleSuccess, getModuleFail);
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
        $scope.total.cancelled.isChecked = $scope.total.all.isChecked;

        $scope.processWithRowSpans();
    }

    /* ----------------------------------------- Helpers/Angular Filters and etc-----------------------------------*/


    $scope.filterCloudAppByTeam = function()
    {
        $scope.reInitTotal();
        $scope.isTotalWasCalculated = false;
        $scope.processWithRowSpans();
    }

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

