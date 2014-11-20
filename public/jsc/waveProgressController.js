/**
 * Created by Heorhi_Vilkitski on 4/11/14.
 */

function waveProgressController($scope, $resource, $window, $filter) {
    var cloudAppDataResource = $resource('/wavedata');

    /* ------------------------------------------------------ Init/Reinit -------------------------------*/
    $scope.init = function () {
        $scope.common = {};
        $scope.dataLoad();
        $scope.showStreams = false;
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
        $scope.getCloudAppData().done($scope.processWithRowSpans);
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
        $scope.allVersions = [{id: "All", name: "All"}, {id: "Q1", name: "Q1"}, {id: "Q2", name: "Q2"}];
        $scope.allStatuses = [
            {name: $scope.STATUS.DEFERRED.name, cards: [], totalReported: 0, totalRequired: 0, totalLeft: 0 },
            {name: $scope.STATUS.OPEN.name, cards: [], totalReported: 0, totalRequired: 0, totalLeft: 0 },
            {name: $scope.STATUS.ASSIGNED.name, cards: [], totalReported: 0, totalRequired: 0, totalLeft: 0 },
            {name: $scope.STATUS.INPROGRESS.name, cards: [], totalReported: 0, totalRequired: 0, totalLeft: 0 },
            {name: $scope.STATUS.CODEREVIEW.name, cards: [], totalReported: 0, totalRequired: 0, totalLeft: 0 },
            {name: $scope.STATUS.REOPENED.name, cards: [], totalReported: 0, totalRequired: 0, totalLeft: 0 },
            {name: $scope.STATUS.READYFORQA.name, cards: [], totalReported: 0, totalRequired: 0, totalLeft: 0 },
            {name: $scope.STATUS.TESTINGINPROGRESS.name, cards: [], totalReported: 0, totalRequired: 0, totalLeft: 0 },
            {name: $scope.STATUS.BLOCKED.name, cards: [], totalReported: 0, totalRequired: 0, totalLeft: 0 },
            {name: $scope.STATUS.RESOLVED.name, cards: [], totalReported: 0, totalRequired: 0, totalLeft: 0 },
            {name: $scope.STATUS.ACCEPTED.name, cards: [], totalReported: 0, totalRequired: 0, totalLeft: 0 }
        ];
        $scope.cloudAppCards = [];
    };

    function FillVersionsCombo() {
        $scope.allVersions = [{id: "All", name: "All"}, {id: "Q1", name: "Q1"}, {id: "Q2", name: "Q2"}];
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
        $scope.allModuleGroups = [{id: "All", name: "All"}];
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
    }

    function FillModulesCombo() {
        $scope.allModules = [{id: "All", name: "All"}];
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
    }

    function FillSmeCombo() {
        $scope.allSMEs = [{id: "All", name: "All"}];
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
    }

    function FillStreamsCombo() {
        $scope.allStreams = [{id: "All", name: "All"}];
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

    $scope.processWithRowSpans = function () {
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
        FillVersionsCombo();
        FillGroupsCombo();
        FillModulesCombo();
        FillSmeCombo();
        FillStreamsCombo();
        SortCombos();

        _.each($scope.cloudAppData.cloudApp, function(cloudAppItem){
            if($scope.filteredMG != $scope.allModuleGroups[0].id && cloudAppItem.moduleGroupName != $scope.filteredMG){
                return;
            }
            if($scope.filteredM != $scope.allModules[0].id && cloudAppItem.moduleName != $scope.filteredM){
                return;
            }
            if($scope.filteredVersion != $scope.allVersions[0].id) {
                if($scope.filteredVersion == "Q1") {
                    if(!(cloudAppItem.fixVersions == "2.0 January 2015" ||
                        cloudAppItem.fixVersions == "3.0 February 2015" ||
                        cloudAppItem.fixVersions == "4.0 March 2015"
                        )) {
                        return;
                    }
                }
                else if($scope.filteredVersion == "Q2") {
                    if(!(cloudAppItem.fixVersions == "5.0 April 2015" ||
                        cloudAppItem.fixVersions == "6.0 May 2015" ||
                        cloudAppItem.fixVersions == "7.0 June 2015"
                        )) {
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
            if($scope.filteredSme != $scope.allSMEs[0].id && cloudAppItem.smeName != $scope.filteredSme){
                return;
            }
            if($scope.filteredStream != $scope.allStreams[0].id && cloudAppItem.streamName != $scope.filteredStream){
                return;
            }
            if($scope.filteredTeam != $scope.allTeams[0].id && cloudAppItem.teamName != $scope.filteredTeam) {
                return;
            }
            var issueEntity = $scope.total.getStatusByName(cloudAppItem.status);
            if (issueEntity.isChecked) {
                $scope.total.pages += cloudAppItem.pages;
                if (!$scope.isTotalWasCalculated) {
                    issueEntity.count++;
                }
                var found = false;
                for(var i=0; i<$scope.cloudAppCards.statuses.length; i++) {
                    var status = $scope.cloudAppCards.statuses[i];
                    if (status.name == cloudAppItem.status) {
                        status.cards.push(getCard(cloudAppItem));
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
                    $scope.cloudAppCards.statuses[$scope.cloudAppCards.statuses.length-1].cards.push(getCard(cloudAppItem));
                }
                if(!$scope.isTotalWasCalculated) {
                    $scope.total.total++;
                }
            }
        });

        $scope.isTotalWasCalculated = true;
    };

    function getCard(cloudAppItem) {
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
            progress: cloudAppItem.summarySP > 0 ? Math.floor(cloudAppItem.reportedSP*100/cloudAppItem.summarySP) : 0,
            priority: priorityNumber,
            pages: cloudAppItem.pages
        };
        return card;
    }
    /* -------------------------------------------------------Event handlers ------------------------ */
    /* --------------------------------------------- Actions ------------------------------*/
    $scope.getCloudAppData = function () {
        var loadingDfrd = $.Deferred();

        var getCloudAppSuccess = function (data) {
            $scope.cloudAppData = data;
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

        $scope.processWithRowSpans();
    };

    /* ----------------------------------------- Helpers/Angular Filters and etc-----------------------------------*/
    $scope.isUnknownExist = function(item)
    {
        return item.indexOf("Unknown") > -1;
    };


    $scope.init();
}

