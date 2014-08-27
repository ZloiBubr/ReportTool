/**
 * Created by Heorhi_Vilkitski on 4/11/14.
 */

function moduleProgressController($scope, $resource, $window, $filter) {
    var moduleDataResource = $resource('/moduledata');

    /* ------------------------------------------------------ Init/Reinit -------------------------------*/
    $scope.init = function () {
        $scope.common = {};
        $scope.dataLoad();
        $scope.sortByDate = false;
        $scope.filterEod = false;
    };

    $scope.reInit = function () {
        $scope.dataLoad();
    };

    $scope.dataLoad = function () {
        $scope.filteredSme = $scope.allSMEs[0].id;
        $scope.filteredMG = $scope.allModuleGroups[0].id;
        $scope.filteredTeam = $scope.allTeams[0].id;
        $scope.isTotalWasCalculated = false;
        $scope.reInitTotal();
        $scope.getModuleData().done($scope.processWithRowSpans);
        $scope.updatedModuleProgressData = $filter('orderBy')($scope.updatedModuleProgressData, $scope.sortingModel.dueDate.getter, !$scope.sortingModel.isASC);
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
        _.each($scope.moduleProgressData.module, function(module) {
            var found = false;
            _.each($scope.allModuleGroups, function(it_group) {
                if(it_group.name == module.moduleGroup) {
                    found = true;
                }
            });
            if(!found) {
                $scope.allModuleGroups.push({id: module.moduleGroup, name: module.moduleGroup});
            }
        });
        _.each($scope.moduleProgressData.module, function(item) {
            var found = false;
            _.each($scope.allSMEs, function(sme) {
                if(sme.name == item.smename) {
                    found = true;
                }
            });
            if(!found) {
                $scope.allSMEs.push({id: item.smename, name: item.smename});
            }
        });
        $scope.allModuleGroups.sort(function (a, b) {
            a = a.name;
            b = b.name;
            if(a == "All") {
                return -1;
            }
            if(b == "All") {
                return 1;
            }
            return a > b ? 1 : a < b ? -1 : 0;
        });
        $scope.allSMEs.sort(function (a, b) {
            a = a.name;
            b = b.name;
            if(a == "All") {
                return -1;
            }
            if(b == "All") {
                return 1;
            }
            return a > b ? 1 : a < b ? -1 : 0;
        });

        _.each($scope.moduleProgressData.module, function(moduleProgressItem) {
            if($scope.filteredMG != $scope.allModuleGroups[0].id && moduleProgressItem.moduleGroup != $scope.filteredMG){
                return;
            }
            if($scope.filteredSme != $scope.allSMEs[0].id && moduleProgressItem.smename != $scope.filteredSme){
                return;
            }
            if($scope.filteredTeam != $scope.allTeams[0].id) {
                var found = false;
                _.each(moduleProgressItem.teamnames, function(teamName) {
                    if(teamName.indexOf($scope.filteredTeam) > -1) {
                        found = true;
                    }
                });
                if(!found) {
                    return;
                }
            }
            if($scope.filterEod && !moduleProgressItem.endOfYearDelivery) {
                return;
            }

            moduleProgressItem.progress = Math.round(moduleProgressItem.progress);
            moduleProgressItem.progress2 = moduleProgressItem.progress.toString() + "%";


            moduleProgressItem.duedate2 = moduleProgressItem.duedate;
            moduleProgressItem.acceptedName = moduleProgressItem.accepted ? "Yes" : "No";

            var accepted = moduleProgressItem.status == "Accepted";
            var readyForQa = moduleProgressItem.status == "Ready for QA" || moduleProgressItem.status == "Testing in Progress";
            var resolved = moduleProgressItem.status == "Resolved";
            var cancelled = moduleProgressItem.modulestatus == "Closed" && moduleProgressItem.moduleresolution == "Out of Scope";
            var notApplicable = moduleProgressItem.modulestatus == "Closed" && moduleProgressItem.moduleresolution == "Done" && moduleProgressItem.pagescount < 1;

            moduleProgressItem.cancelled = cancelled || notApplicable;
            moduleProgressItem.readyForQA = readyForQa;
            moduleProgressItem.readyForAcceptance = resolved;

            if(cancelled) {
                var cancelledEntity = $scope.total.getStatusByName("Cancelled");
                processEntity(cancelledEntity, moduleProgressItem);
            }
            else if(notApplicable) {
                var notApplicableEntity = $scope.total.getStatusByName("Not Applicable");
                processEntity(notApplicableEntity, moduleProgressItem);
            }
            else if(accepted) {
                var acceptedEntity = $scope.total.getStatusByName("Accepted");
                processEntity(acceptedEntity, moduleProgressItem);
            }
            else if(readyForQa) {
                var readyForQaEntity = $scope.total.getStatusByName("Ready for QA");
                processEntity(readyForQaEntity, moduleProgressItem);
            }
            else if(resolved) {
                var resolvedEntity = $scope.total.getStatusByName("Resolved");
                processEntity(resolvedEntity, moduleProgressItem);
            }
            else {
                var inProgressEntity = $scope.total.getStatusByName("In Progress");
                processEntity(inProgressEntity, moduleProgressItem);
            }

            if(!$scope.isTotalWasCalculated) {
                $scope.total.total++;
            }
        });

        $scope.onSortingClick();
        $scope.isTotalWasCalculated = true;
    };

    function processEntity(entity, moduleProgressItem) {
        if (entity.isChecked) {
            if (!$scope.isTotalWasCalculated) {
                entity.count++;
            }
            $scope.updatedModuleProgressData.push(moduleProgressItem);
        }
    }

    function sortModuleProgressData() {
        var getter =  $scope.sortingModel[$scope.sortingModel.selected].getter;
        $scope.updatedModuleProgressData = $filter('orderBy')($scope.updatedModuleProgressData, getter, !$scope.sortingModel.isASC);
    }

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
    };

    $scope.onSelectDeselectAll = function()
    {
        $scope.total.accepted.isChecked = $scope.total.all.isChecked;
        $scope.total.resolved.isChecked = $scope.total.all.isChecked;
        $scope.total.inProgress.isChecked = $scope.total.all.isChecked;
        $scope.total.readyForQA.isChecked = $scope.total.all.isChecked;
        $scope.total.cancelled.isChecked = $scope.total.all.isChecked;
        $scope.total.notApplicable.isChecked = $scope.total.all.isChecked;

        $scope.processWithRowSpans();
    };

    $scope.onSortingClick = function(sortName){
        if(sortName == $scope.sortingModel.selected){
            $scope.sortingModel.isASC = !$scope.sortingModel.isASC;
        }
        else if(sortName != null) {
                $scope.sortingModel.selected = sortName;
                $scope.sortingModel.isASC = true;
        }

        sortModuleProgressData();
    };

    $scope.onFilterEod = function() {
        $scope.reInitTotal();
        $scope.isTotalWasCalculated = false;
        $scope.processWithRowSpans();
    }
    /* ----------------------------------------- Helpers/Angular Filters and etc-----------------------------------*/


    $scope.filterModule = function()
    {
        $scope.reInitTotal();
        $scope.isTotalWasCalculated = false;
        $scope.processWithRowSpans();
    };

    $scope.isUnknownExist = function(item)
    {
        return item.indexOf("Unknown") > -1;
    };

    $scope.sortingModel = {
        selected: "dueDate",
        isASC : true,

        progress:{
            getter: function(item){ return item.progress; }
        },

        dueDate:{
            getter: function(item){ return item.duedate2; }
        },

        moduleGroup:{
            getter: function(item){ return item.name; }
        },

        smeName:{
            getter: function(item){ return item.smename; }
        }
    };


    $scope.init();
}

