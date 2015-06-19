/**
 * Created by Heorhi_Vilkitski on 4/11/14.
 */

function waveProgressController($scope, $resource, $window, $filter, localStorageService) {
    var cloudAppDataResource = $resource('/wavedata');

    /* ------------------------------------------------------ Init/Reinit -------------------------------*/
    $scope.init = function () {
        $scope.common = {};
        $scope.dataLoad();
        $scope.isShowSideBar = true;
        $scope.showStreams = false;
        $scope.detailedView = false;
        $scope.salesDemoPath = false;
        $scope.blockedVP = false;
    };

    $scope.reInit = function () {
        $scope.dataLoad();
    };

    $scope.dataLoad = function () {
        $scope.filteredSme = $scope.allSMEs[0].id;
        $scope.filteredMG = $scope.allModuleGroups[0].id;
        $scope.filteredM = $scope.allModules[0].id;
        $scope.filteredTeam = $scope.allTeams[0].id;
        $scope.filteredStream = $scope.allStreams[0].id;
        $scope.filteredVersion = $scope.allVersions[0].id;
        $scope.isTotalWasCalculated = false;
        $scope.reInitTotal();
        $scope.getCloudAppData();
        $scope.cloudAppCards = [];
    };

    $scope.reInitTotal = function(){
        $scope.total = new $scope.statuses();
        $scope.total.all = {isChecked :true};
        $scope.total.total = 0;
        $scope.total.pages = 0;
        $scope.allStreams = [{id: "All", name: "All"}];
        $scope.allSMEs = [{id: "All", name: "All"}];
        $scope.allModuleGroups = [{id: "All", name: "All"}];
        $scope.allModules = [{id: "All", name: "All"}];
        $scope.allVersions = [
            {id: "All", name: "All"},
            {id: "Q1", name: "Q1"},
            {id: "Q2", name: "Q2"},
            {id: "Q3", name: "Q3"},
            {id: "Q12", name: "Q12"},
            {id: "CORE", name: "CORE"}
        ];
        $scope.allStatuses = [
            {name: $scope.STATUS.DEFERRED.name, cards: [], totalReported: 0, totalRequired: 0, totalLeft: 0 },
            {name: $scope.STATUS.OPEN.name, cards: [], totalReported: 0, totalRequired: 0, totalLeft: 0 },
            {name: $scope.STATUS.ASSIGNED.name, cards: [], totalReported: 0, totalRequired: 0, totalLeft: 0 },
            {name: $scope.STATUS.BLOCKED.name, cards: [], totalReported: 0, totalRequired: 0, totalLeft: 0 },
            {name: $scope.STATUS.INPROGRESS.name, cards: [], totalReported: 0, totalRequired: 0, totalLeft: 0 },
            {name: $scope.STATUS.CODEREVIEW.name, cards: [], totalReported: 0, totalRequired: 0, totalLeft: 0 },
            {name: $scope.STATUS.REOPENED.name, cards: [], totalReported: 0, totalRequired: 0, totalLeft: 0 },
            {name: $scope.STATUS.READYFORQA.name, cards: [], totalReported: 0, totalRequired: 0, totalLeft: 0 },
            {name: $scope.STATUS.TESTINGINPROGRESS.name, cards: [], totalReported: 0, totalRequired: 0, totalLeft: 0 },
            {name: $scope.STATUS.RESOLVED.name, cards: [], totalReported: 0, totalRequired: 0, totalLeft: 0 },
            {name: $scope.STATUS.ACCEPTED.name, cards: [], totalReported: 0, totalRequired: 0, totalLeft: 0 },
            {name: $scope.STATUS.PRODUCTION.name, cards: [], totalReported: 0, totalRequired: 0, totalLeft: 0 },
            {name: $scope.STATUS.PMREVIEW.name, cards: [], totalReported: 0, totalRequired: 0, totalLeft: 0 },
            {name: $scope.STATUS.LAREADY.name, cards: [], totalReported: 0, totalRequired: 0, totalLeft: 0 }
        ];
        $scope.cloudAppCards = [];
    };

    function FillVersionsCombo() {
        _.each($scope.cloudAppData.cloudApp, function(cloudAppItem){
            var found = false;
            var versionProcessed = cloudAppItem.fixVersions == "" ? "Undefined" : cloudAppItem.fixVersions;
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
        _.each($scope.cloudAppData.cloudApp, function(cloudAppItem){
            var found = false;
            _.each($scope.allModuleGroups, function (it_group) {
                if (it_group.name == cloudAppItem.moduleGroupName) {
                    found = true;
                }
            });
            if (!found) {
                $scope.allModuleGroups.push({id: cloudAppItem.moduleGroupName, name: cloudAppItem.moduleGroupName});
            }
        });
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
    }

    function FillModulesCombo() {
        _.each($scope.cloudAppData.cloudApp, function(cloudAppItem){
            if($scope.filteredMG != $scope.allModuleGroups[0].id && cloudAppItem.moduleGroupName != $scope.filteredMG){
                return;
            }
            var found = false;
            _.each($scope.allModules, function (module) {
                if (module.name == cloudAppItem.moduleName) {
                    found = true;
                }
            });
            if (!found) {
                $scope.allModules.push({id: cloudAppItem.moduleName, name: cloudAppItem.moduleName});
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
        _.each($scope.cloudAppData.cloudApp, function(cloudAppItem){
            var found = false;
            _.each($scope.allSMEs, function (sme) {
                if (sme.name == cloudAppItem.smeName) {
                    found = true;
                }
            });
            if (!found) {
                $scope.allSMEs.push({id: cloudAppItem.smeName, name: cloudAppItem.smeName});
            }
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
    }

    function FillStreamsCombo() {
        _.each($scope.cloudAppData.cloudApp, function(cloudAppItem){
            if($scope.filteredTeam != $scope.allTeams[0].id && cloudAppItem.teamName != $scope.filteredTeam){
                return;
            }
            var found = false;
            _.each($scope.allStreams, function (sme) {
                if (sme.name == cloudAppItem.streamName) {
                    found = true;
                }
            });
            if (!found) {
                $scope.allStreams.push({id: cloudAppItem.streamName, name: cloudAppItem.streamName});
            }
        });
        $scope.allStreams.sort(function (a, b) {
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

    function SortCombos() {
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

    function fillAllCombos() {
        FillVersionsCombo();
        FillGroupsCombo();
        FillModulesCombo();
        FillSmeCombo();
        FillStreamsCombo();
        SortCombos();
    }

    $scope.processWithRowSpans = function (addCards) {
        $scope.total.pages = 0;
        $scope.cloudAppCards=[];
        $scope.cloudAppCards.statuses = $scope.allStatuses;
        for(var i=0; i<$scope.cloudAppCards.statuses.length; i++) {
            $scope.cloudAppCards.statuses[i].cards = [];
            $scope.cloudAppCards.statuses[i].totalRequired = 0;
            $scope.cloudAppCards.statuses[i].totalReported = 0;
            $scope.cloudAppCards.statuses[i].totalLeft = 0;
        }
        if($scope.cloudAppData == undefined) {
            return;
        }
        if(addCards) {
            $scope.saveStorageToLocalDb();
        }
        _.each($scope.cloudAppData.cloudApp, function(cloudAppItem){
            if(addCards && $scope.filteredMG != $scope.allModuleGroups[0].id && cloudAppItem.moduleGroupName != $scope.filteredMG){
                return;
            }
            if(addCards && $scope.filteredM != $scope.allModules[0].id && cloudAppItem.moduleName != $scope.filteredM){
                return;
            }
            if(addCards && $scope.filteredVersion != $scope.allVersions[0].id) {
                if($scope.filteredVersion == "Q1") {
                    if(!$scope.versionHelper.isQ1Version(cloudAppItem.fixVersions)) {
                        return;
                    }
                }
                else if($scope.filteredVersion == "Q2") {
                    if(!$scope.versionHelper.isQ2Version(cloudAppItem.fixVersions)) {
                        return;
                    }
                }
                else if($scope.filteredVersion == "Q12") {
                    if(!$scope.versionHelper.isQ1Version(cloudAppItem.fixVersions) &&
                    !$scope.versionHelper.isQ2Version(cloudAppItem.fixVersions)) {
                        return;
                    }
                }
                else if($scope.filteredVersion == "Q3") {
                    if(!$scope.versionHelper.isQ3Version(cloudAppItem.fixVersions)) {
                        return;
                    }
                }
                else if($scope.filteredVersion == "CORE") {
                    if(!$scope.versionHelper.isCoreVersion(cloudAppItem.fixVersions)) {
                        return;
                    }
                }
                else if($scope.filteredVersion == "Undefined"){
                    if(cloudAppItem.fixVersions != "") {
                        return;
                    }
                }
                else if (cloudAppItem.fixVersions != $scope.filteredVersion) {
                    return;
                }
            }
            if(addCards && $scope.filteredSme != $scope.allSMEs[0].id && cloudAppItem.smeName != $scope.filteredSme){
                return;
            }
            if(addCards && $scope.filteredStream != $scope.allStreams[0].id && cloudAppItem.streamName != $scope.filteredStream){
                return;
            }
            if(addCards && $scope.filteredTeam != $scope.allTeams[0].id && cloudAppItem.teamName != $scope.filteredTeam) {
                return;
            }
            if(addCards && $scope.salesDemoPath && cloudAppItem.acceptanceLabels.indexOf("InSalesDemoPath") < 0) {
                return;
            }
            if(addCards && $scope.blockedVP && cloudAppItem.acceptanceLabels.indexOf("InSalesDemoPath") < 0) {
                return;
            }
            var issueEntity = $scope.total.getStatusByName(cloudAppItem.status);
            if (issueEntity.isChecked) {
                $scope.total.pages += cloudAppItem.pages;
                if (!$scope.isTotalWasCalculated) {
                    issueEntity.count++;
                }
                if(addCards) {
                    var found = false;
                    for(var i=0; i<$scope.cloudAppCards.statuses.length; i++) {
                        var status = $scope.cloudAppCards.statuses[i];
                        if (status.name == cloudAppItem.status) {
                            status.cards.push(getCard($scope.detailedView, cloudAppItem));
                            status.totalReported += cloudAppItem.reportedSP;
                            status.totalRequired += cloudAppItem.summarySP;
                            status.totalLeft = status.totalRequired - status.totalReported;
                            found = true;
                            status.cards.sort(function(a,b) {
                                var aa = a.priority;
                                var bb = b.priority;
                                var c = a.name;
                                var d = b.name;
                                return aa > bb ? 1 :
                                    aa < bb ? -1 :
                                        c > d ? 1 :
                                            c < d ? -1 : 0;
                            });
                        }
                    }
                    if(!found) {
                        $scope.cloudAppCards.statuses[$scope.cloudAppCards.statuses.length-1].cards.push(getCard($scope.detailedView,cloudAppItem));
                    }
                }
                if(!$scope.isTotalWasCalculated) {
                    $scope.total.total++;
                }
            }
        });

        $scope.isTotalWasCalculated = true;
    };

    function getCard(detailed, cloudAppItem) {
        var priorityNumber = $scope.getPriorityNumber(cloudAppItem.priority);
        var remaining = cloudAppItem.summarySP - cloudAppItem.reportedSP;
        var card = {
            name: cloudAppItem.name,
            restSP: remaining,
            reportedSP: cloudAppItem.reportedSP,
            summarySP: cloudAppItem.summarySP,
            status: cloudAppItem.status,
            uri: cloudAppItem.uri,
            dueDateConfirmed: cloudAppItem.dueDateConfirmed,
            progress: cloudAppItem.progress,
            priority: priorityNumber,
            pages: cloudAppItem.pages,
            assignees: detailed ? cloudAppItem.assignees : [],
            devTimeSpent: cloudAppItem.devTimeSpent,
            qaTimeSpent: cloudAppItem.qaTimeSpent,
            testingProgress: cloudAppItem.testingProgress ? cloudAppItem.testingProgress : 0,
            checklistsProgress: cloudAppItem.checklistsProgress ? cloudAppItem.checklistsProgress : 0,
            xxl: cloudAppItem.xxl,
            moduleName: cloudAppItem.moduleName,
            acceptanceUri: cloudAppItem.acceptanceUri,
            acceptanceAssignee: cloudAppItem.acceptanceAssignee,
            cusfinish: cloudAppItem.cusfinish ? new Date(cloudAppItem.cusfinish).toDateString() : undefined,
            pmhfinish: cloudAppItem.pmhfinish ? new Date(cloudAppItem.pmhfinish).toDateString() : undefined,
            lafinish: cloudAppItem.lafinish ? new Date(cloudAppItem.lafinish).toDateString() : undefined,
            blockedVP: cloudAppItem.acceptanceLabels.indexOf("InSalesDemoPath") > -1
        };
        return card;
    }
    /* -------------------------------------------------------Event handlers ------------------------ */
    /* --------------------------------------------- Actions ------------------------------*/
    $scope.getCloudAppData = function () {
        var loadingDfrd = $.Deferred();

        var getCloudAppSuccess = function (data) {
            $scope.cloudAppData = data;
            fillAllCombos();
//            $scope.processWithRowSpans(false);
            $scope.loadStorageFromLocalDb();
            FillStreamsCombo();
            $scope.filterModule();
            loadingDfrd.resolve();
        };

        var getCloudAppFail = function (err) {
            $scope.errMessage = err;
            loadingDfrd.reject(err);
        };

        cloudAppDataResource.get($scope.common, getCloudAppSuccess, getCloudAppFail);
        return loadingDfrd.promise();
    };



    /* ------------------------------------------- DOM/Angular events --------------------------------------*/
    $scope.onSelectDeselectAll = function()
    {
        $scope.total.open.isChecked = $scope.total.all.isChecked;
        $scope.total.reopened.isChecked = $scope.total.all.isChecked;
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
        $scope.total.production.isChecked = $scope.total.all.isChecked;
        $scope.total.pmReview.isChecked = $scope.total.all.isChecked;
        $scope.total.laReady.isChecked = $scope.total.all.isChecked;

        $scope.processWithRowSpans(true);
    };

    $scope.onToggleSideBar = function(){
        $scope.isShowSideBar = !$scope.isShowSideBar;
    };

    /* ----------------------------------------- Helpers/Angular Filters and etc-----------------------------------*/
    $scope.isUnknownExist = function(item)
    {
        return item.indexOf("Unknown") > -1;
    };
    $scope.filterModule = function()
    {
        $scope.isTotalWasCalculated = false;
        $scope.total.resetCounters();
        $scope.total.total = 0;
        $scope.total.pages = 0;
        $scope.processWithRowSpans(true);
    };
    $scope.filterTeam = function() {
        FillStreamsCombo();
        $scope.filterModule();
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
            filteredStream: $scope.filteredStream,
            total_deferred_isChecked: $scope.total.deferred.isChecked,
            total_open_isChecked: $scope.total.open.isChecked,
            total_reopened_isChecked: $scope.total.reopened.isChecked,
            total_assigned_isChecked: $scope.total.assigned.isChecked,
            total_inProgress_isChecked: $scope.total.inProgress.isChecked,
            total_codeReview_isChecked: $scope.total.codeReview.isChecked,
            total_readyForQA_isChecked: $scope.total.readyForQA.isChecked,
            total_testingInProgress_isChecked: $scope.total.testingInProgress.isChecked,
            total_blocked_isChecked: $scope.total.blocked.isChecked,
            total_resolved_isChecked: $scope.total.resolved.isChecked,
            total_accepted_isChecked: $scope.total.accepted.isChecked,
            total_production_isChecked: $scope.total.production.isChecked,
            total_pmReview_isChecked: $scope.total.pmReview.isChecked,
            total_laReady_isChecked: $scope.total.laReady.isChecked,
            total_all_isChecked: $scope.total.all.isChecked,
            salesDemoPath: $scope.salesDemoPath,
            blockedVP: $scope.blockedVP
        };
        localStorageService.set('waveProgressController', storage);
    };

    $scope.loadStorageFromLocalDb = function() {
        // restore session
        if(!_.isEmpty(localStorageService.get('waveProgressController')))
        {
            try {
                var storage = localStorageService.get('waveProgressController');
                $scope.detailedView = storage.detailedView;
                $scope.filteredVersion = storage.filteredVersion;
                $scope.filteredSme = storage.filteredSme;
                $scope.filteredMG = storage.filteredMG;
                $scope.filteredM = storage.filteredM;
                $scope.filteredTeam = storage.filteredTeam;
                $scope.filteredStream = storage.filteredStream;
                $scope.total.deferred.isChecked = storage.total_deferred_isChecked;
                $scope.total.open.isChecked = storage.total_open_isChecked;
                $scope.total.reopened.isChecked = storage.total_reopened_isChecked;
                $scope.total.assigned.isChecked = storage.total_assigned_isChecked;
                $scope.total.inProgress.isChecked = storage.total_inProgress_isChecked;
                $scope.total.codeReview.isChecked = storage.total_codeReview_isChecked;
                $scope.total.readyForQA.isChecked = storage.total_readyForQA_isChecked;
                $scope.total.testingInProgress.isChecked = storage.total_testingInProgress_isChecked;
                $scope.total.blocked.isChecked = storage.total_blocked_isChecked;
                $scope.total.resolved.isChecked = storage.total_resolved_isChecked;
                $scope.total.accepted.isChecked = storage.total_accepted_isChecked;
                $scope.total.production.isChecked = storage.total_production_isChecked;
                $scope.total.pmReview.isChecked = storage.total_pmReview_isChecked;
                $scope.total.laReady.isChecked = storage.total_laReady_isChecked;
                $scope.total.all.isChecked = storage.total_all_isChecked;
                $scope.salesDemoPath = storage.salesDemoPath;
                $scope.blockedVP = storage.blockedVP;
            }
            catch (ex) {
                console.error(ex);
            }
        }
    };

    $scope.init();
}

