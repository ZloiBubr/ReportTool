function moduleProgressController($scope, $resource, $window, $filter, localStorageService) {
    var moduleDataResource = $resource('/moduledata');

    /* ------------------------------------------------------ Init/Reinit -------------------------------*/
    $scope.init = function () {
        $scope.common = {};
        $scope.dataLoad();
        $scope.isShowSideBar = true;
        $scope.sortByDate = false;
        $scope.showTeamTable = true;
        $scope.showStreams = false;
        $scope.showModules = true;
        $scope.showCards = true;
    };

    $scope.reInit = function () {
        $scope.dataLoad();
    };

    $scope.dataLoad = function () {
        $scope.filteredSme = $scope.allSMEs[0].id;
        $scope.filteredMG = $scope.allModuleGroups[0].id;
        $scope.filteredTeam = $scope.allTeams[0].id;
        $scope.filteredVersion = $scope.allVersions[0].id;
        $scope.isTotalWasCalculated = false;
        $scope.reInitTotal();
        $scope.getModuleData();
        $scope.teamLoadData = [];
    };

    $scope.reInitTotal = function(){
        $scope.total = new $scope.statuses();
        $scope.total.all = {isChecked :true};
        $scope.total.total = 0;
        $scope.allSMEs = [{id: "All", name: "All"}];
        $scope.allModuleGroups = [{id: "All", name: "All"}];
        $scope.allVersions = [{id: "All", name: "All"}, {id: "Q1", name: "Q1"}, {id: "Q2", name: "Q2"}];
        $scope.showVersions = [];
        $scope.teamLoadData = [];
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
                $scope.showVersions.push(versionProcessed);
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
        $scope.showVersions.sort(function (a, b) {
            return a > b ? 1 : a < b ? -1 : 0;
        });
    }

    function sortCardsData() {
        for (var j = 0; j < $scope.teamLoadData.length; j++) {
            var team = $scope.teamLoadData[j];
            for (var k = 0; k < team.versions.length; k++) {
                var version = team.versions[k];
                version.cards.sort(function (a, b) {
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

        $scope.teamLoadData.sort(function (a, b) {
            a = a.name;
            b = b.name;
            return a > b ? 1 : a < b ? -1 : 0;
        });
    }

    function fillAllCombos() {
        FillVersionsCombo();
        FillGroupsCombo();
        FillSmeCombo();
        SortCombos();
    }

    $scope.processWithRowSpans = function (addCards) {
        $scope.total.doneSP = 0;
        $scope.total.summSP = 0;
        $scope.teamLoadData = [];
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

    function ProcessCards(moduleProgressItem, status) {
        //calculating data for top table
        var teamName = moduleProgressItem.teamName;
        if($scope.showStreams) {
            teamName = moduleProgressItem.streamName ? teamName + ':' + moduleProgressItem.streamName : teamName;
        }
        var teamObj = getTeamObj(teamName);
        for(var j=0; j<teamObj.versions.length; j++) {
            var version = teamObj.versions[j];
            if (version.name == moduleProgressItem.fixVersions) {
                version.done += moduleProgressItem.reportedSP;
                version.total += moduleProgressItem.summarySP;
                version.restSP = version.total - version.done;
                fillCards(teamObj, version, status, moduleProgressItem);
            }
        }
    }

    function fillCards(teamobj, version, status, item) {
        var found = false;
        var cardName = $scope.showModules ? getCleanModuleName(item.name) : item.smename;

        var initUri = "https://jira.epam.com/jira/issues/?jql=project%20%3D%20PLEX-UXC%20and%20issuetype%20%3D%20epic%20and%20assignee%20%3D%20";
        var endUri = version.name == "" ?"%20and%20fixVersion%20is%20EMPTY" : "%20and%20fixVersion%20%3D%20%22" + version.name + "%22";
        var veryEndUri = "%20and%20labels%20in%20(Team"+ teamobj.name + ")";

        var priorityNumber = $scope.getPriorityNumber(item.priority);

        for(var i=0; i<version.cards.length; i++) {
            var card = version.cards[i];
            if(card.name == cardName) {
                card.reportedSP += item.reportedSP;
                card.summarySP += item.summarySP;
                card.restSP = card.summarySP - card.reportedSP;
                card.uri = initUri + name + endUri + veryEndUri;
                card.progress = card.summarySP > 0 ? card.reportedSP*100/card.summarySP : 0;
                card.priority = card.priority < priorityNumber ? card.priority : priorityNumber;
                card.hasblockers |= item.hasblockers;
                card.hasdeferred |= item.hasdeferred;
                card.cloudAppsCount += item.pagescount;
                card.summaryTestingProgress += item.testingProgress ? item.testingProgress : 0;
                card.testingProgress = card.summaryTestingProgress / card.cloudAppsCount;
                card.summaryChecklistsProgress += item.checklistsProgress ? item.checklistsProgress : 0;
                card.checklistsProgress = item.checklistsProgress / card.cloudAppsCount;

                var oldStatus = $scope.total.getStatusByName(card.status);
                var newStatus = $scope.total.getStatusByName(status);
                if(newStatus.weight < oldStatus.weight){
                    card.status = newStatus.name;
                }
                found = true;
            }
        }
        if(!found) {
            var newCard = {
                name: cardName,
                restSP: item.summarySP - item.reportedSP,
                reportedSP: item.reportedSP,
                summarySP: item.summarySP,
                uri: item.uri,
                dueDateConfirmed: item.dueDateConfirmed,
                progress: item.progress,
                priority: priorityNumber,
                status: status,
                hasblockers: item.hasblockers,
                hasdeferred: item.hasdeferred,
                testingProgress: item.testingProgress ? item.testingProgress : 0,
                summaryTestingProgress: item.testingProgress ? item.testingProgress : 0,
                checklistsProgress: item.checklistsProgress ? item.checklistsProgress : 0,
                summaryChecklistsProgress: item.checklistsProgress ? item.checklistsProgress : 0,
                cloudAppsCount: item.pagescount
            };
            version.cards.push(newCard);
        }
    }

    function getTeamObj(teamName) {
        var teamObj = null;
        for(var i=0; i<$scope.teamLoadData.length; i++) {
            var team = $scope.teamLoadData[i];
            if (team.name == teamName) {
                teamObj = team;
            }
        }
        if (teamObj == null) {
            var newTeam = {
                name: teamName,
                versions: []
            };
            for(var j=0; j<$scope.showVersions.length; j++) {
                var version = $scope.showVersions[j];
                if(version == "Undefined") {
                    version = "";
                }
                newTeam.versions.push( {name:version, done: 0, total: 0, cards: [], completed: false});
            }
            $scope.teamLoadData.push(newTeam);
            teamObj = newTeam;
        }
        return teamObj;
    }

    function getCleanModuleName(moduleName) {
        var index = moduleName.indexOf("Module");
        if(index < 0) {
            return moduleName;
        }

        var prefix = "";
        var index2 = moduleName.indexOf("Phase");
        if(index2 > 0) {
            prefix = "P" + moduleName.substring(index2+6, index2+8);
        }

        return prefix + " " + moduleName.substring(0,index);
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
            $scope.processWithRowSpans(false);
            $scope.loadStorageFromLocalDb();
            $scope.processWithRowSpans(true);
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
            showStreams: $scope.showStreams,
            showCards: $scope.showCards,
            showModules: $scope.showModules,
            filteredVersion: $scope.filteredVersion,
            filteredSme: $scope.filteredSme,
            filteredMG: $scope.filteredMG,
            filteredTeam: $scope.filteredTeam,
            total_inProgress_isChecked: $scope.total.inProgress.isChecked,
            total_readyForQA_isChecked: $scope.total.readyForQA.isChecked,
            total_resolved_isChecked: $scope.total.resolved.isChecked,
            total_accepted_isChecked: $scope.total.accepted.isChecked,
            total_cancelled_isChecked: $scope.total.cancelled.isChecked,
            total_notApplicable_isChecked: $scope.total.notApplicable.isChecked,
            total_all_isChecked: $scope.total.all.isChecked
        };
        localStorageService.set('moduleProgressController', storage);
    };

    $scope.loadStorageFromLocalDb = function() {
        // restore session
        if(!_.isEmpty(localStorageService.get('moduleProgressController')))
        {
            try {
                var storage = localStorageService.get('moduleProgressController');
                    $scope.showStreams = storage.showStreams;
                    $scope.showCards = storage.showCards;
                    $scope.showModules = storage.showModules;
                    $scope.filteredVersion = storage.filteredVersion;
                    $scope.filteredSme = storage.filteredSme;
                    $scope.filteredMG = storage.filteredMG;
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

