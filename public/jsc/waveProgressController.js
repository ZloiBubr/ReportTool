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
                            $scope.invertedWaveProgressData.push({appItem: cloudAppItem});
                            return cloudAppMemo + 1;
                        },0);
                    $scope.invertedWaveProgressData[firstCloudAppIndex].module = moduleItem;
                        return moduleMemo + moduleItem.rowSpan;

                },0);

                $scope.invertedWaveProgressData[firstModuleGroupIndex].moduleGroup = moduleGroupItem;
                return moduleGroupMemo + moduleGroupItem.rowSpan;
            }, 0);
            $scope.invertedWaveProgressData[firstWaveIndex].wave = waveProgressItem;
        });

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

    /* ----------------------------------------- Helpers/Angular Filters and etc-----------------------------------*/


    $scope.isUnknownExist = function(item)
    {
        return item.indexOf("Unknown") == 0;
    }

    $scope.init();
}

