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
        $scope.total = {
            open:{count:0, isChecked:true},
            assigned:{count:0, isChecked:true},
            inProgress:{count:0, isChecked:true},
            codeReview:{count:0, isChecked:true},
            accepted:{count:0, isChecked:true},
            readyForQA:{count:0, isChecked:true},
            testingInProgress:{count:0, isChecked:true},
            resolved:{count:0, isChecked:true},
            blocked:{count:0, isChecked:true},
            reopened:{count:0, isChecked:true},
            deferred:{count:0, isChecked:true},
            unspecified:{count:0, isChecked:true},
            all:{isChecked :true},
            total:0
        };
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
                            var statusEntity = $scope.getStatusEntity(cloudAppItem.status);
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
//
//
//        _.each($scope.waveProgressData, function(waveProgressItem){
//            $scope.waveProgressData.rowSpan = _.reduce(waveProgressItem.moduleGroup, function(moduleGroupMemo, moduleGroupItem){
//                item.moduleGroup.rowSpan = _.reduce(moduleGroupItem.module, function(moduleMemo, moduleItem){
//
//                    item.module.rowSpan = _.reduce(moduleItem.cloudApp, function(cloudAppMemo, cloudAppItem){
//                            return cloudAppMemo + 1;
//                    },0);
//                    return moduleMemo + item.module.rowSpan;
//
//                },0);
//                return moduleMemo + item.moduleGroup.rowSpan;
//
//                }, 0);
//        });
    };

    $scope.getStatusEntity = function(item)
    {
        var resultEntity;

        switch(item)
        {
            case "Open":
                resultEntity = $scope.total.open;
                break;
            case "Deferred":
                resultEntity = $scope.total.deferred;
                break;
            case "Assigned":
                resultEntity = $scope.total.assigned;
                break;
            case "In Progress":
                resultEntity = $scope.total.inProgress;
                break;
            case "Code Review":
                resultEntity = $scope.total.codeReview;
                break;
            case "Accepted":
                resultEntity = $scope.total.accepted;
                break;
            case "Ready for QA":
                resultEntity = $scope.total.readyForQA;
                break;
            case "Testing in Progress":
                resultEntity = $scope.total.testingInProgress;
                break;
            case "Resolved":
                resultEntity = $scope.total.resolved;
                break;
            case "Blocked":
                resultEntity = $scope.total.blocked;
                break;
            case "Reopened":
                resultEntity = $scope.total.reopened;
                break;
            case "":
                resultEntity = $scope.total.unspecified;
                break;
        }
        return resultEntity;
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
        $scope.total.reopened.isChecked = $scope.total.all.isChecked;
        $scope.total.deferred.isChecked = $scope.total.all.isChecked;
        $scope.total.unspecified.isChecked = $scope.total.all.isChecked;

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

