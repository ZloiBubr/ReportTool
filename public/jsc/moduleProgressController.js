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
        $scope.filteredSme = $scope.allSMEs[0].id;
        $scope.filteredMG = $scope.allModuleGroups[0].id;
        $scope.isTotalWasCalculated = false;
        $scope.reInitTotal();
        $scope.getModuleData().done($scope.processWithRowSpans);
    };

    $scope.reInitTotal = function(){
        $scope.total = new $scope.statuses();
        $scope.total.all = {isChecked :true};
        $scope.total.total = 0;
        $scope.allSMEs = [{id: "All", name: "All"}];
        $scope.allModuleGroups = [{id: "All", name: "All"}];
    };

    $scope.processWithRowSpans = function () {
        $scope.total.pages = 0;
        $scope.updatedModuleProgressData=[];
        //fill in groups and sme combos
        _.each($scope.moduleProgressData.wave, function(waveProgressItem) {
            _.each(waveProgressItem.moduleGroup, function(group) {
                var found = false;
                _.each($scope.allModuleGroups, function(it_group) {
                    if(it_group.name == group.name) {
                        found = true;
                    }
                });
                if(!found) {
                    $scope.allModuleGroups.push({id: group.name, name: group.name});
                }
            });
            _.each(waveProgressItem.moduleGroup, function(groupProgressItem) {
                _.each(groupProgressItem.module, function(moduleProgressItem) {
                    _.each(moduleProgressItem.smenames, function(smeName) {
                        var found = false;
                        _.each($scope.allSMEs, function(sme) {
                            if(sme.name == smeName) {
                                found = true;
                            }
                        });
                        if(!found) {
                            $scope.allSMEs.push({id: smeName, name: smeName});
                        }
                    });
                })
            });
        });

        _.each($scope.moduleProgressData.wave, function(waveProgressItem) {
            _.each(waveProgressItem.moduleGroup, function(groupProgressItem) {
                if($scope.filteredMG != $scope.allModuleGroups[0].id && groupProgressItem.name != $scope.filteredMG){
                    return;
                }
                _.each(groupProgressItem.module, function(moduleProgressItem) {
                    if($scope.filteredSme != $scope.allSMEs[0].id && moduleProgressItem.smenames.indexOf($scope.filteredSme) < 0){
                        return;
                    }
                    var acceptedEntity = $scope.total.getStatusByName("Accepted");
                    var done = moduleProgressItem.progress == 100;
                    if(done) {
                        if(!$scope.isTotalWasCalculated) {
                            acceptedEntity.count++;
                        }
                    }
                    if(!$scope.isTotalWasCalculated) {
                        $scope.total.total++;
                    }

                    if(moduleProgressItem.name == "") {
                        moduleProgressItem.name = "#Unknown";
                    }

                    if(new Date(moduleProgressItem.duedate) < new Date('2014-01-01')) {
                        moduleProgressItem.duedate = "";
                    }
                    moduleProgressItem.progress = Math.round(moduleProgressItem.progress);
                    moduleProgressItem.progress2 = moduleProgressItem.progress.toString() + "%";

                    if(acceptedEntity.isChecked && done)
                    {
                        $scope.updatedModuleProgressData.push(moduleProgressItem);
                    }
                    else if(!done) {
                        $scope.updatedModuleProgressData.push(moduleProgressItem);
                    }
                });
            });
        });

        $scope.updatedModuleProgressData.sort(function (a, b) {
            a = a.name;
            b = b.name;
            return a > b ? 1 : a < b ? -1 : 0;
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
        $scope.total.accepted.isChecked = $scope.total.all.isChecked;

        $scope.processWithRowSpans();
    }

    /* ----------------------------------------- Helpers/Angular Filters and etc-----------------------------------*/


    $scope.filterModuleBySme = function()
    {
        $scope.reInitTotal();
        $scope.isTotalWasCalculated = false;
        $scope.processWithRowSpans();
    }

    $scope.filterModuleByGroup = function()
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

