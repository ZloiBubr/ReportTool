/**
 * Created by Heorhi_Vilkitski on 8/8/2014.
 */

function CloudAppEstimationController($scope, $resource, $window, $filter, localStorageService) {
    var moduleDataResource = $resource('/moduledata');

    /* ------------------------------------------------------ Init/Reinit -------------------------------*/
    $scope.init = function () {
        $scope.isEnabled = false;

        $scope.$watch('common.filteredTeam', function(newValue, oldValue) {
            if(!_.isUndefined($scope.moduleProgressData)){
                $scope.estimation = {};
                $scope.prepareData();
            }
        });

        $scope.getModuleData().done($scope.prepareData);
    };

    $scope.reInit = function () {
        $scope.prepareData();
    };

    $scope.prepareData = function () {
        var restored_model = false;
        var storage;
        if(_.isUndefined($scope.moduleProgressData))
        {
            alert("Please, wait till data will be loaded");
            return;
        }

        if(!_.isUndefined($scope.common.filteredTeam) && $scope.common.filteredTeam == $scope.allTeams[0].id)
        {
            $scope.isEnabled = false;
            return;
        }else{
            $scope.isEnabled = true;
        }

        // restore session
        if(!_.isEmpty(localStorageService.get('estimationSettings')))
        {
            try {
                storage = localStorageService.get('estimationSettings');
                $scope.estimation = {
                    dayDevSpVelocity: storage.dayDevSpVelocity,
                    dayQaSpVelocity: storage.dayQaSpVelocity,
                    acceptanceDaysGap: storage.acceptanceDaysGap,
                    holidayList: storage.holidayList
                };

                // copy all properties from storage avoid "module" property
                $scope.estimation.streams = {};
                _.each(storage.streams, function(streamItem, streamKey){
                    $scope.estimation.streams[streamKey] = {};
                    _.each(streamItem, function(propertyItem, propertyKey){
                        if(propertyKey == "modules"){return;}
                        $scope.estimation.streams[streamKey][propertyKey] = propertyItem;
                    })
                });

                restored_model = true;
            }
            catch (ex) {
                console.error(ex);
                if(confirm("Exception during restoring your previous settings, would you like to override you previous settings and continue?"))
                {
                    $scope.estimation = {};
                }else{
                    throw ex;
                }
            }
        }
        else{
            $scope.estimation = {};
            $scope.estimation.holidayList = "11/25/2014;12/31/2014;1/1/2015;1/7/2014;4/21/2015;5/1/2015";
        }

        $scope.estimation.team = _.find($scope.allTeams,function(teamItem){return teamItem.id === $scope.common.filteredTeam});
        _.each($scope.estimation.team.streams, function(streamItem){
            var streamShortCut = streamItem.replace("Stream","");
            $scope.estimation.streams = $scope.estimation.streams || {};
            $scope.estimation.streams[streamItem] = $scope.estimation.streams[streamItem] || {};
            $scope.estimation.streams[streamItem].modules = _.sortBy(_.filter($scope.moduleProgressData.module, function(moduleItem){
                return moduleItem.streamName === streamShortCut;
            }), function(item){return [item.duedate, $scope.getPriorityNumber(item.priority)].join("_");});

            if(restored_model) {
//                _.each($scope.estimation.streams[streamItem].modules, function (moduleItem) {
//                    var module = _.find(storage.streams[streamItem].modules,function(storModuleItem){
//                        return storModuleItem.key === moduleItem.key;
//                    });
//
//                    if(!_.isUndefined(module) && _.isNumber(module.qaLeftCustomDays)){
//                        moduleItem.qaLeftCustomDays = module.qaLeftCustomDays;
//                    }
//                });
            }
        });

        if(restored_model){
            $scope.onRecalc();
        }
    };




    /* -------------------------------------------------------Event handlers ------------------------ */

   $scope.onRecalc = function(){
        var storage = {
            dayDevSpVelocity: $scope.estimation.dayDevSpVelocity,
            dayQaSpVelocity: $scope.estimation.dayQaSpVelocity,
            acceptanceDaysGap: $scope.estimation.acceptanceDaysGap,
            holidayList: $scope.estimation.holidayList
        };
        storage.streams = {};
        _.each($scope.estimation.team.streams, function(streamItem){
            storage.streams[streamItem] = storage.streams[streamItem] || {};
            storage.streams[streamItem].devCapacity = $scope.estimation.streams[streamItem].devCapacity;
            storage.streams[streamItem].qaCapacity = $scope.estimation.streams[streamItem].qaCapacity;
            storage.streams[streamItem].modules = $scope.estimation.streams[streamItem].modules;
        });
        localStorageService.add('estimationSettings', storage);
        //sessionStorage.estimationSettings = JSON.stringify(storage);

        var holidayList = [];
        try{
            if($scope.estimation.holidayList){
                _.each($scope.estimation.holidayList.split(";"), function(dateStr){
                    holidayList.push(new Date(dateStr));
                });
            }
        }
        catch (ex){
            console.error(ex);
        }

        _.each($scope.estimation.team.streams, function(streamItem){

            var previousDevModuleEndDate, previousQAModuleEndDate;
            _.each($scope.estimation.streams[streamItem].modules, function(moduleItem){
                moduleItem.devLeftWorkDays = ((moduleItem.summarySP - moduleItem.reportedSP) / $scope.estimation.dayDevSpVelocity) / $scope.estimation.streams[streamItem].devCapacity;
                var factorQaReady = 0.6*(moduleItem.checklistsProgress/100) + 0.4*(moduleItem.testingProgress/100);
                moduleItem.qaLeftWorkDays = ((moduleItem.summarySP - (moduleItem.summarySP*factorQaReady)) / $scope.estimation.dayQaSpVelocity) / $scope.estimation.streams[streamItem].qaCapacity;

                // apply risk
                moduleItem.devLeftWorkDays = _.isUndefined($scope.estimation.devRisk) || $scope.estimation.devRisk == 0 ? moduleItem.devLeftWorkDays : moduleItem.devLeftWorkDays * $scope.estimation.devRisk;
                moduleItem.qaLeftWorkDays = _.isUndefined($scope.estimation.qaRisk) || $scope.estimation.qaRisk == 0 ? moduleItem.qaLeftWorkDays : moduleItem.qaLeftWorkDays * $scope.estimation.qaRisk;


                if(_.isNumber(moduleItem.devLeftWorkDays)) {
                    previousDevModuleEndDate = previousDevModuleEndDate ? previousDevModuleEndDate : new Date();
                    moduleItem.endDevDate = new Date(previousDevModuleEndDate).addBusDays(moduleItem.devLeftWorkDays, holidayList);
                    previousDevModuleEndDate = moduleItem.endDevDate;
                } else{ return; }

                if(_.isNumber(moduleItem.qaLeftWorkDays)) {
                    previousQAModuleEndDate = previousQAModuleEndDate ? previousQAModuleEndDate : moduleItem.endDevDate;
                    moduleItem.endQADate = moduleItem.qaLeftCustomDays ? new Date(previousQAModuleEndDate).addBusDays(moduleItem.qaLeftCustomDays, holidayList) : new Date(previousQAModuleEndDate).addBusDays(moduleItem.qaLeftWorkDays, holidayList);
                    previousQAModuleEndDate = moduleItem.endQADate;
                } else{ return; }

                if(_.isNumber($scope.estimation.acceptanceDaysGap)) {
                    moduleItem.endAccDate = new Date(moduleItem.endQADate).addBusDays($scope.estimation.acceptanceDaysGap, holidayList);
                } else{ return; }
            })
        });
    };

    $scope.onEstimationClearButton = function(){
        localStorageService.remove('estimationSettings');
        $scope.estimation = {};
        $scope.prepareData();
    }

    $scope.onModalShow = function(){
        $('#estimateModal').modal({show:true});
    };

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

    /* ----------------------------------------- Helpers/Angular Filters and etc-----------------------------------*/

    $scope.dateEqualColor = function(date1,date2)
    {
        var d1 = date1 instanceof Date ? date1 : new Date(date1);
        var d2 = date1 instanceof Date ? date2 : new Date(date2);

        var result;
        if(d1.getTime() < d2.getTime()){
            result = "red"
        } else if (d1.getTime() == d2.getTime()){
            result = "yellow";
        } else {
            result = "green";
        }

        return result;
    };

    $scope.daysDiff = function(date1,date2)
    {
        var d1 = date1 instanceof Date ? date1 : new Date(date1);
        var d2 = date1 instanceof Date ? date2 : new Date(date2);

        var timeDiff = d2.getTime() - d1.getTime();
        return Math.ceil(timeDiff / (1000 * 3600 * 24));
    };


    $scope.init();
}
