function moduleTargetsController($scope, $resource, $window, $filter, localStorageService) {
    var moduleDataResource = $resource('/moduledata');

    /* ------------------------------------------------------ Init/Reinit -------------------------------*/
    $scope.init = function () {
        $scope.common = {};
        $scope.dataLoad();
        $scope.isShowSideBar = true;
        $scope.detailedView = false;
        $scope.moduleDueData = [];
    };

    $scope.reInit = function () {
        $scope.dataLoad();
    };

    $scope.dataLoad = function () {
        $scope.filteredSme = $scope.allSMEs[0].id;
        $scope.filteredMG = $scope.allModuleGroups[0].id;
        $scope.filteredM = $scope.allModules[0].id;
        $scope.filteredTeam = $scope.allTeams[0].id;
        $scope.filteredVersion = $scope.allVersions[0].id;
        $scope.isTotalWasCalculated = false;
        $scope.reInitTotal();
        $scope.getModuleData();
        $scope.moduleDueData = [];
    };

    $scope.reInitTotal = function(){
        $scope.total = new $scope.statuses();
        $scope.total.all = {isChecked :true};
        $scope.total.total = 0;
        $scope.allSMEs = [{id: "All", name: "All"}];
        $scope.allModuleGroups = [{id: "All", name: "All"}];
        $scope.allVersions = [{id: "All", name: "All"}, {id: "Q1", name: "Q1"}, {id: "Q2", name: "Q2"}];
        $scope.showWeeks = [];
        $scope.moduleDueData = [];
    };

    function getNextSunday(d) {
        var day = d.getDay(),
            diff = d.getDate() - day + (day == 0 ? 0:7); // adjust when day is sunday
        return new Date(d.setDate(diff));
    }

    function fillWeeksArray() {
        var startDate = new Date(2014, 07, 25);
        var runDate = startDate;
        while(runDate < new Date(2015, 08, 30)) {
            runDate = getNextSunday(runDate);
            $scope.showWeeks.push({date: $scope.getHeaderDate(runDate), text: ''});
            runDate.setDate(runDate.getDate()+7);
        }
    }

    $scope.getHeaderDate = function(date) {
        var result = date.toDateString();
        result = result.substr(4);
        //result = result.substr(0, result.length - 5);
        return result;
    };

    $scope.getCurrentWeek = function() {
        return $scope.getHeaderDate(getNextSunday(new Date(Date.now())));
    };

    function FillVersionsCombo() {
        //fill in Versions combo
        _.each($scope.moduleProgressData.module, function (module) {
            var found = false;
            var versionProcessed = module.fixVersions == "" ? "Undefined" : module.fixVersions;
            _.each($scope.allVersions, function (version) {
                if (version.name == versionProcessed) {
                    found = true;
                }
            });
            if (!found) {
                $scope.allVersions.push({id: versionProcessed, name: versionProcessed});
            }
        });
    }

    function FillGroupsCombo() {
        //fill in groups and sme combos
        _.each($scope.moduleProgressData.module, function (module) {
            var found = false;
            _.each($scope.allModuleGroups, function (it_group) {
                if (it_group.name == module.moduleGroup) {
                    found = true;
                }
            });
            if (!found) {
                $scope.allModuleGroups.push({id: module.moduleGroup, name: module.moduleGroup});
            }
        });
    }

    function FillModulesCombo() {
        $scope.allModules = [{id: "All", name: "All"}];
        _.each($scope.moduleProgressData.module, function(module){
            if($scope.filteredMG != $scope.allModuleGroups[0].id && module.moduleGroupName != $scope.filteredMG){
                return;
            }
            var found = false;
            _.each($scope.allModules, function (module) {
                if (module.name == module.moduleName) {
                    found = true;
                }
            });
            if (!found) {
                $scope.allModules.push({id: module.moduleName, name: module.name});
            }
        });
        $scope.allModules.sort(function (a, b) {
            a = a.name;
            b = b.name;
            if (a == "All") {
                return -1;
            }
            if (b == "All") {
                return 1;
            }
            return a > b ? 1 : a < b ? -1 : 0;
        });
    }


    function FillSmeCombo() {
        _.each($scope.moduleProgressData.module, function (item) {
            var found = false;
            _.each($scope.allSMEs, function (sme) {
                if (sme.name == item.smename) {
                    found = true;
                }
            });
            if (!found) {
                $scope.allSMEs.push({id: item.smename, name: item.smename});
            }
        });
    }

    function SortCombos() {
        $scope.allModuleGroups.sort(function (a, b) {
            a = a.name;
            b = b.name;
            if (a == "All") {
                return -1;
            }
            if (b == "All") {
                return 1;
            }
            return a > b ? 1 : a < b ? -1 : 0;
        });
        $scope.allSMEs.sort(function (a, b) {
            a = a.name;
            b = b.name;
            if (a == "All") {
                return -1;
            }
            if (b == "All") {
                return 1;
            }
            return a > b ? 1 : a < b ? -1 : 0;
        });
        $scope.allVersions.sort(function (a, b) {
            a = a.name;
            b = b.name;
            if (a == "All") {
                return -1;
            }
            if (b == "All") {
                return 1;
            }
            return a > b ? 1 : a < b ? -1 : 0;
        });
    }

    function sortCardsData() {
        $scope.moduleDueData.sort(function (a, b) {
            a = a.name;
            b = b.name;
            return a > b ? 1 : a < b ? -1 : 0;
        });
    }

    function fillAllCombos() {
        FillVersionsCombo();
        FillGroupsCombo();
        FillModulesCombo();
        FillSmeCombo();
        SortCombos();
        fillWeeksArray();
    }

    $scope.processWithRowSpans = function (addCards) {
        $scope.total.doneSP = 0;
        $scope.total.summSP = 0;
        $scope.moduleDueData = [];
        if($scope.moduleProgressData == undefined) {
            return;
        }
        if(addCards) {
            $scope.saveStorageToLocalDb();
        }

        _.each($scope.moduleProgressData.module, function(moduleProgressItem) {
            if(addCards && $scope.filteredMG != $scope.allModuleGroups[0].id && moduleProgressItem.moduleGroup != $scope.filteredMG){
                return;
            }
            if(addCards && $scope.filteredM != $scope.allModules[0].id && moduleProgressItem.name != $scope.filteredM){
                return;
            }
            if(addCards && $scope.filteredVersion != $scope.allVersions[0].id) {
                if($scope.filteredVersion == "Q1") {
                    if(!(moduleProgressItem.fixVersions == "2.0 January 2015" ||
                        moduleProgressItem.fixVersions == "3.0 February 2015" ||
                        moduleProgressItem.fixVersions == "4.0 March 2015"
                        )) {
                        return;
                    }
                }
                else if($scope.filteredVersion == "Q2") {
                    if(!(moduleProgressItem.fixVersions == "5.0 April 2015" ||
                        moduleProgressItem.fixVersions == "6.0 May 2015" ||
                        moduleProgressItem.fixVersions == "7.0 June 2015"
                        )) {
                        return;
                    }
                }
                else if($scope.filteredVersion == "Undefined"){
                    if(moduleProgressItem.fixVersions != "") {
                        return;
                    }
                }
                else if (moduleProgressItem.fixVersions != $scope.filteredVersion) {
                    return;
                }
            }
            if(addCards && $scope.filteredSme != $scope.allSMEs[0].id && moduleProgressItem.smename != $scope.filteredSme){
                return;
            }
            if(addCards && $scope.filteredTeam != $scope.allTeams[0].id&& moduleProgressItem.teamName != $scope.filteredTeam) {
                return;
            }

            if(moduleProgressItem.moduleStatus == $scope.STATUS.CLOSED.name &&
                moduleProgressItem.moduleResolution == $scope.RESOLUTION.OUTOFSCOPE.name) {
                var cancelledEntity = $scope.total.getStatusByName($scope.STATUS.CANCELED.name);
                processEntity(cancelledEntity, moduleProgressItem);
                if(addCards && cancelledEntity.isChecked) {
                    ProcessCards(moduleProgressItem, $scope.STATUS.CANCELED.name);
                }
            }
            else if(moduleProgressItem.moduleStatus == $scope.STATUS.CLOSED.name &&
                moduleProgressItem.moduleResolution == $scope.RESOLUTION.DONE.name &&
                moduleProgressItem.pagescount < 1) {
                var notApplicableEntity = $scope.total.getStatusByName($scope.STATUS.NOTAPPLICABLE.name);
                processEntity(notApplicableEntity, moduleProgressItem);
                if(addCards && notApplicableEntity.isChecked) {
                    ProcessCards(moduleProgressItem, $scope.STATUS.CANCELED.name);
                }
            }
            else if(moduleProgressItem.status == $scope.STATUS.ACCEPTED.name) {
                var acceptedEntity = $scope.total.getStatusByName($scope.STATUS.ACCEPTED.name);
                processEntity(acceptedEntity, moduleProgressItem);
                if(addCards && acceptedEntity.isChecked) {
                    ProcessCards(moduleProgressItem, $scope.STATUS.ACCEPTED.name);
                }
            }
            else if(moduleProgressItem.status == $scope.STATUS.READYFORQA.name ||
                moduleProgressItem.status == $scope.STATUS.TESTINGINPROGRESS.name) {
                var readyForQaEntity = $scope.total.getStatusByName($scope.STATUS.READYFORQA.name);
                processEntity(readyForQaEntity, moduleProgressItem);
                if(addCards && readyForQaEntity.isChecked) {
                    ProcessCards(moduleProgressItem, $scope.STATUS.READYFORQA.name);
                }
            }
            else if(moduleProgressItem.status == $scope.STATUS.PRODUCTION.name &&
                moduleProgressItem.moduleStatus == $scope.STATUS.CLOSED.name) {
                var productionEntity = $scope.total.getStatusByName($scope.STATUS.PRODUCTION.name);
                processEntity(productionEntity, moduleProgressItem);
                if(addCards && productionEntity.isChecked) {
                    ProcessCards(moduleProgressItem, $scope.STATUS.PRODUCTION.name);
                }
            }
            else if(moduleProgressItem.status == $scope.STATUS.RESOLVED.name) {
                var resolvedEntity = $scope.total.getStatusByName($scope.STATUS.RESOLVED.name);
                processEntity(resolvedEntity, moduleProgressItem);
                if(addCards && resolvedEntity.isChecked) {
                    ProcessCards(moduleProgressItem, $scope.STATUS.RESOLVED.name);
                }
            }
            else {
                var inProgressEntity = $scope.total.getStatusByName($scope.STATUS.INPROGRESS.name);
                processEntity(inProgressEntity, moduleProgressItem);
                if(addCards && inProgressEntity.isChecked) {
                    ProcessCards(moduleProgressItem, $scope.STATUS.INPROGRESS.name);
                }
            }

            if(!$scope.isTotalWasCalculated) {
                $scope.total.total++;
            }
        });
        sortCardsData();
        $scope.isTotalWasCalculated = true;
    };

    function getDevItemColor(date, status) {
        var color = 'blue';
        var today = new Date(Date.now());
        if (isDevStatus(status)) {
            var developmentFinishDate = new Date(date);
            if (developmentFinishDate < today) {
                color = 'red';
            }
            else {
                today.setDate(today.getDate() + 7);
                if (developmentFinishDate < today) {
                    color = 'yellow';
                }
            }
        }
        else if (isQAAcceptedProdStatus(status)) {
            color = 'green';
        }
        return color;
    }

    function getQAItemColor(date, status) {
        var color = 'blue';
        var today = new Date(Date.now());
        if (isDevQAStatus(status)) {
            var qaFinishDate = new Date(date);
            if (qaFinishDate < today) {
                color = 'red';
            }
            else {
                today.setDate(today.getDate() + 7);
                if (qaFinishDate < today) {
                    color = 'yellow';
                }
            }
        }
        else if (isQAProdStatus(status)) {
            color = 'green';
        }
        return color;
    }

    function getAcceptanceItemColor(date, status, acceptanceStatus) {
        var color = 'blue';
        var today = new Date(Date.now());
        if (isDevQAStatus(status)) {
            var acceptanceFinishDate = new Date(date);
            if (acceptanceFinishDate < today) {
                color = 'red';
            }
            else {
                today.setDate(today.getDate() + 7);
                if (acceptanceFinishDate < today) {
                    color = 'yellow';
                }
            }
        }
        else if (isAcceptedProdStatus(status)) {
            color = 'green';
        }
        return color;
    }

    function getCompletionItemColor(date, status, acceptanceStatus, moduleStatus) {
        var color = 'blue';
        var today = new Date(Date.now());
        if (moduleStatus != $scope.STATUS.CLOSED.name && moduleStatus != $scope.STATUS.PRODUCTION.name) {
            var completeDate = new Date(date);
            if (completeDate < today) {
                color = 'red';
            }
            else {
                today.setDate(today.getDate() + 7);
                if (completeDate < today) {
                    color = 'yellow';
                }
            }
        }
        else if (moduleStatus == $scope.STATUS.CLOSED.name || moduleStatus == $scope.STATUS.PRODUCTION.name) {
            color = 'green';
        }
        return color;
    }

    function ProcessCards(moduleProgressItem, status) {
        var rowItem;
        if($scope.detailedView) {
            var cloudApps = moduleProgressItem.cloudApps;
            for(var i=0; i < cloudApps.length; i++) {
                var item = cloudApps[i];
                var uri = 'https://jira.epam.com/jira/issues/?jql=project%20%3D%20PLEX-UXC%20and%20issuetype%20%3D%20story%20and%20labels%20in%20(CloudApp_' + item.name + ')';
                rowItem = getRowItem(
                    item.name,
                    uri,
                    item.devFinishDate,
                    item.qaFinishDate,
                    item.acceptanceFinishDate,
                    item.customerCompleteDate,
                    item.acceptanceStatus,
                    item.cloudAppStatus,
                    item.cloudAppStatus,
                    item.acceptanceStatus
                );
                $scope.moduleDueData.push(rowItem);
            }
        }
        else {
            var found = false;
            for(var i=0; i<$scope.moduleDueData.length; i++) {
                if($scope.moduleDueData[i].name == moduleProgressItem.name) {
                    found = true;
                }
            }
            if(!found) {
                rowItem = getRowItem(
                    moduleProgressItem.name,
                    moduleProgressItem.uri,
                    moduleProgressItem.devFinishDate,
                    moduleProgressItem.qaFinishDate,
                    moduleProgressItem.acceptanceFinishDate,
                    moduleProgressItem.customerCompleteDate,
                    calcAcceptanceStatus(moduleProgressItem.acceptanceStatus),
                    moduleProgressItem.moduleStatus,
                    moduleProgressItem.status,
                    status);
                $scope.moduleDueData.push(rowItem);
            }
        }
    }

    function getRowItem(name, uri, devFinishDate, qaFinishDate, acceptanceFinishDate, customerCompleteDate, acceptanceStatus, moduleStatus, caclulatedStatus, status) {
        var moduleItem = {
            name: name,
            status: status,
            weeks: [],
            uri: uri
        };
        var devDate = $scope.getHeaderDate(getNextSunday(new Date(devFinishDate)));
        var qaDate = $scope.getHeaderDate(getNextSunday(new Date(qaFinishDate)));
        var acceptanceDate = $scope.getHeaderDate(getNextSunday(new Date(acceptanceFinishDate)));
        var completionDate = $scope.getHeaderDate(getNextSunday(new Date(customerCompleteDate)));
        for(var i=0; i<$scope.showWeeks.length; i++) {
            var weekItem = {date: $scope.showWeeks[i].date, items: []};
            if($scope.showWeeks[i].date == devDate) {
                var color = getDevItemColor(devFinishDate, caclulatedStatus);
                weekItem.items.push({text: 'D', color: color});
            }
            if($scope.showWeeks[i].date == qaDate) {
                var color = getQAItemColor(qaFinishDate, caclulatedStatus);
                weekItem.items.push({text: 'Q', color: color});
            }
            if($scope.showWeeks[i].date == acceptanceDate) {
                var color = getAcceptanceItemColor(acceptanceFinishDate, caclulatedStatus, acceptanceStatus);
                weekItem.items.push({text: 'A', color: color});
            }
            if($scope.showWeeks[i].date == completionDate) {
                var color = getCompletionItemColor(customerCompleteDate, caclulatedStatus, acceptanceStatus, moduleStatus);
                weekItem.items.push({text: 'P', color: color});
            }



            moduleItem.weeks.push(weekItem);
        }
        return moduleItem;
    }

    function calcAcceptanceStatus(acceptanceArray) {
        if(acceptanceArray.length < 1) {
            return $scope.STATUS.OPEN.name;
        }
        if(acceptanceArray.length == 1) {
            return acceptanceArray[0];
        }
        var result = acceptanceArray[0];
        for(var i=1; i < acceptanceArray.length; i++) {
            var status1 = $scope.total.getStatusByName(result);
            var status2 = $scope.total.getStatusByName(acceptanceArray[i]);
            if(status2.weight < status1.weight) {
                result = status2.name;
            }
        }
    }

    function isDevStatus(status) {
        if(status == $scope.STATUS.DEFERRED.name ||
            status == $scope.STATUS.OPEN.name ||
            status == $scope.STATUS.BLOCKED.name ||
            status == $scope.STATUS.REOPENED.name ||
            status == $scope.STATUS.ASSIGNED.name ||
            status == $scope.STATUS.INPROGRESS.name ||
            status == $scope.STATUS.CODEREVIEW.name) {
            return true;
        }
        return false;
    }

    function isDevQAStatus(status) {
        if(status == $scope.STATUS.DEFERRED.name ||
            status == $scope.STATUS.OPEN.name ||
            status == $scope.STATUS.BLOCKED.name ||
            status == $scope.STATUS.REOPENED.name ||
            status == $scope.STATUS.ASSIGNED.name ||
            status == $scope.STATUS.INPROGRESS.name ||
            status == $scope.STATUS.CODEREVIEW.name ||
            status == $scope.STATUS.READYFORQA.name ||
            status == $scope.STATUS.TESTINGINPROGRESS.name) {
            return true;
        }
        return false;
    }

    function isQAAcceptedProdStatus(status) {
        if(status != $scope.STATUS.READYFORQA.name &&
            status != $scope.STATUS.TESTINGINPROGRESS.name &&
            status != $scope.STATUS.RESOLVED.name &&
            status != $scope.STATUS.ACCEPTED.name &&
            status != $scope.STATUS.CLOSED.name &&
            status != $scope.STATUS.PRODUCTION.name) {
            return false;
        }
        return true;
    }

    function isQAProdStatus(status) {
        if(status != $scope.STATUS.RESOLVED.name &&
            status != $scope.STATUS.ACCEPTED.name &&
            status != $scope.STATUS.CLOSED.name &&
            status != $scope.STATUS.PRODUCTION.name) {
            return false;
        }
        return true;
    }

    function isAcceptedProdStatus(status) {
        if(status == $scope.STATUS.ACCEPTED.name ||
            status == $scope.STATUS.RESOLVED.name ||
            status == $scope.STATUS.CLOSED.name ||
            status == $scope.STATUS.PRODUCTION.name) {
            return true;
        }
        return false;
    }

    function isClosedStatus(status) {
        if(status == $scope.STATUS.CLOSED.name ||
            status == $scope.STATUS.PRODUCTION.name) {
            return true;
        }
        return false;
    }

    function isDevQAResolvedStatus(status) {
        if(status == $scope.STATUS.DEFERRED.name ||
            status == $scope.STATUS.OPEN.name ||
            status == $scope.STATUS.BLOCKED.name ||
            status == $scope.STATUS.REOPENED.name ||
            status == $scope.STATUS.ASSIGNED.name ||
            status == $scope.STATUS.INPROGRESS.name ||
            status == $scope.STATUS.CODEREVIEW.name ||
            status == $scope.STATUS.READYFORQA.name ||
            status == $scope.STATUS.TESTINGINPROGRESS.name ||
            status == $scope.STATUS.RESOLVED.name) {
            return true;
        }
        return false;
    }

    function processEntity(entity, moduleProgressItem) {
        if (entity.isChecked) {
            if (!$scope.isTotalWasCalculated) {
                entity.count++;
            }
            $scope.total.doneSP += moduleProgressItem.reportedSP;
            $scope.total.summSP += moduleProgressItem.summarySP;
        }
    }

    /* -------------------------------------------------------Event handlers ------------------------ */
    /* --------------------------------------------- Actions ------------------------------*/
    $scope.getModuleData = function () {
        var loadingDfrd = $.Deferred();

        var getModuleSuccess = function (data) {
            $scope.moduleProgressData = data;
            fillAllCombos();
//            $scope.processWithRowSpans(false);
            $scope.loadStorageFromLocalDb();
            $scope.filterModule();
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
        $scope.total.production.isChecked = $scope.total.all.isChecked;

        $scope.processWithRowSpans(true);
    };

    $scope.onToggleSideBar = function(){
        $scope.isShowSideBar = !$scope.isShowSideBar;
    };

    /* ----------------------------------------- Helpers/Angular Filters and etc-----------------------------------*/


    $scope.filterModule = function()
    {
        $scope.isTotalWasCalculated = false;
        $scope.total.resetCounters();
        $scope.total.total = 0;
        $scope.total.pages = 0;
        $scope.processWithRowSpans(true);
    };

    $scope.isUnknownExist = function(item)
    {
        return item.indexOf("Unknown") > -1;
    };

    $scope.saveStorageToLocalDb = function() {
        // save session
        var storage = {
            detailedView: $scope.detailedView,
            filteredVersion: $scope.filteredVersion,
            filteredSme: $scope.filteredSme,
            filteredMG: $scope.filteredMG,
            filteredM: $scope.filteredM,
            filteredTeam: $scope.filteredTeam,
            total_inProgress_isChecked: $scope.total.inProgress.isChecked,
            total_readyForQA_isChecked: $scope.total.readyForQA.isChecked,
            total_resolved_isChecked: $scope.total.resolved.isChecked,
            total_accepted_isChecked: $scope.total.accepted.isChecked,
            total_cancelled_isChecked: $scope.total.cancelled.isChecked,
            total_notApplicable_isChecked: $scope.total.notApplicable.isChecked,
            total_all_isChecked: $scope.total.all.isChecked
        };
        localStorageService.set('moduleTargetsController', storage);
    };

    $scope.loadStorageFromLocalDb = function() {
        // restore session
        if(!_.isEmpty(localStorageService.get('moduleTargetsController')))
        {
            try {
                var storage = localStorageService.get('moduleTargetsController');
                $scope.detailedView = storage.detailedView;
                $scope.filteredVersion = storage.filteredVersion;
                $scope.filteredSme = storage.filteredSme;
                $scope.filteredMG = storage.filteredMG;
                $scope.filteredM = storage.filteredM;
                $scope.filteredTeam = storage.filteredTeam;
                $scope.total.inProgress.isChecked = storage.total_inProgress_isChecked;
                $scope.total.readyForQA.isChecked = storage.total_readyForQA_isChecked;
                $scope.total.resolved.isChecked = storage.total_resolved_isChecked;
                $scope.total.accepted.isChecked = storage.total_accepted_isChecked;
                $scope.total.cancelled.isChecked = storage.total_cancelled_isChecked;
                $scope.total.notApplicable.isChecked = storage.total_notApplicable_isChecked;
                $scope.total.all.isChecked = storage.total_all_isChecked;
            }
            catch (ex) {
                console.error(ex);
            }
        }
    };

    $scope.init();
}

