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
            if($scope.filteredTeam != $scope.allTeams[0].id && moduleProgressItem.teamnames.indexOf($scope.filteredTeam) < 0){
                return;
            }
            moduleProgressItem.progress = Math.round(moduleProgressItem.progress);
            moduleProgressItem.progress2 = moduleProgressItem.progress.toString() + "%";

            moduleProgressItem.duedate2 = moduleProgressItem.duedate;
            moduleProgressItem.acceptedName = moduleProgressItem.accepted ? "Yes" : "No";

            var accepted = moduleProgressItem.status == "Accepted";
            var readyForQa = moduleProgressItem.status == "Ready for QA" || moduleProgressItem.status == "Testing in Progress";
            var resolved = moduleProgressItem.status == "Resolved";

            moduleProgressItem.readyForQA = readyForQa;
            moduleProgressItem.readyForAcceptance = resolved;

            var acceptedEntity = $scope.total.getStatusByName("Accepted");
            processEntity(acceptedEntity, accepted, $scope.updatedModuleProgressData, moduleProgressItem);
            var readyForQaEntity = $scope.total.getStatusByName("Ready for QA");
            processEntity(readyForQaEntity, readyForQa, $scope.updatedModuleProgressData, moduleProgressItem);
            var resolvedEntity = $scope.total.getStatusByName("Resolved");
            processEntity(resolvedEntity, resolved, $scope.updatedModuleProgressData, moduleProgressItem);
            var inProgressEntity = $scope.total.getStatusByName("In Progress");
            processEntity(inProgressEntity, !accepted && !resolved && !readyForQa, $scope.updatedModuleProgressData, moduleProgressItem);

            if(!$scope.isTotalWasCalculated) {
                $scope.total.total++;
            }
        });

        $scope.updatedModuleProgressData = $filter('orderBy')($scope.updatedModuleProgressData, $scope.sortingModel.dueDate.getter, !$scope.sortingModel.isASC);

        $scope.isTotalWasCalculated = true;
    };

    function processEntity(entity, condition, scope, moduleProgressItem) {
        if (entity.isChecked && condition) {
            if (!$scope.isTotalWasCalculated) {
                entity.count++;
            }
            scope.push(moduleProgressItem);
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

        $scope.processWithRowSpans();
    };

    $scope.onSortingClick = function(sortName){
        if(sortName == $scope.sortingModel.selected){
            $scope.sortingModel.isASC = !$scope.sortingModel.isASC;
        }
        else {
            $scope.sortingModel.selected = sortName;
            $scope.sortingModel.isASC = true;
        }

        sortModuleProgressData();
    };

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

