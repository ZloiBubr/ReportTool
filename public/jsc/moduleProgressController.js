function moduleProgressController($scope, $resource, $window, $filter, $cookies) {
    var moduleDataResource = $resource('/moduledata');

    /* ------------------------------------------------------ Init/Reinit -------------------------------*/
    $scope.init = function () {
        $scope.common = {};
        $scope.dataLoad();
        $scope.sortByDate = false;
        $scope.showTeamTable = false;
        $scope.showStreams = false;
        $scope.showModules = false;
        $scope.showCards = false;
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
        $scope.getModuleData().done($scope.processWithRowSpans);
        $scope.updatedModuleProgressData = $filter('orderBy')($scope.updatedModuleProgressData, $scope.sortingModel.dueDate.getter, !$scope.sortingModel.isASC);
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

    $scope.processWithRowSpans = function () {
        $scope.total.doneSP = 0;
        $scope.total.summSP = 0;
        $scope.updatedModuleProgressData=[];
        $scope.teamLoadData = [];
        FillVersionsCombo();
        FillGroupsCombo();
        FillSmeCombo();
        SortCombos();
        _.each($scope.moduleProgressData.module, function(moduleProgressItem) {
            if($scope.filteredMG != $scope.allModuleGroups[0].id && moduleProgressItem.moduleGroup != $scope.filteredMG){
                return;
            }
            if($scope.filteredVersion != $scope.allVersions[0].id) {
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
                if(cancelledEntity.isChecked) {
                    ProcessCards(moduleProgressItem, "Cancelled");
                }
            }
            else if(notApplicable) {
                var notApplicableEntity = $scope.total.getStatusByName("Not Applicable");
                processEntity(notApplicableEntity, moduleProgressItem);
                if(notApplicableEntity.isChecked) {
                   ProcessCards(moduleProgressItem, "Cancelled");
                }
            }
            else if(accepted) {
                var acceptedEntity = $scope.total.getStatusByName("Accepted");
                processEntity(acceptedEntity, moduleProgressItem);
                if(acceptedEntity.isChecked) {
                    ProcessCards(moduleProgressItem, "Accepted");
                }
            }
            else if(readyForQa) {
                var readyForQaEntity = $scope.total.getStatusByName("Ready for QA");
                processEntity(readyForQaEntity, moduleProgressItem);
                if(readyForQaEntity.isChecked) {
                    ProcessCards(moduleProgressItem, "ReadyForQA");
                }
            }
            else if(resolved) {
                var resolvedEntity = $scope.total.getStatusByName("Resolved");
                processEntity(resolvedEntity, moduleProgressItem);
                if(resolvedEntity.isChecked) {
                  ProcessCards(moduleProgressItem, "Resolved");
                }
            }
            else {
                var inProgressEntity = $scope.total.getStatusByName("In Progress");
                processEntity(inProgressEntity, moduleProgressItem);
                if(inProgressEntity.isChecked) {
                    ProcessCards(moduleProgressItem, "InProgress");
                }
            }

            if(!$scope.isTotalWasCalculated) {
                $scope.total.total++;
            }
        });

        $scope.teamLoadData.sort(function (a, b) {
            a = a.name;
            b = b.name;
            return a > b ? 1 : a < b ? -1 : 0;
        });
        $scope.onSortingClick();
        $scope.isTotalWasCalculated = true;
    };

    function ProcessCards(moduleProgressItem, status) {
        //calculating data for top table
        for(var i=0; i<moduleProgressItem.teamnames.length; i++) {
            var teamName = moduleProgressItem.teamnames[i];
            var teamobj = getTeamObj(teamName);
            for(var j=0; j<teamobj.versions.length; j++) {
                var version = teamobj.versions[j];
                if (version.name == moduleProgressItem.fixVersions) {
                    version.done += moduleProgressItem.reportedSP;
                    version.total += moduleProgressItem.summarySP;
                    version.restSP = Math.floor(version.total - version.done);
                    var moduleName = $scope.showModules ? getCleanModuleName(moduleProgressItem.name) : moduleProgressItem.smename;
                    var reportedSP = Math.floor(moduleProgressItem.reportedSP);
                    var summarySP = Math.floor(moduleProgressItem.summarySP);
                    fillSmeNames(version.smeNames, moduleName, reportedSP, summarySP, status);
                }
            }
        }
    }

    function fillSmeNames(smeNames, name, reportedSP, summarySP, status) {
        var found = false;
        for(var i=0; i<smeNames.length; i++) {
            var card = smeNames[i];
            if(card.name == name) {
                card.reportedSP += reportedSP;
                card.summarySP += summarySP;
                card.restSP = card.summarySP - card.reportedSP;
                var oldStatus = card.readyForQA ? "ReadyForQA" :
                    card.readyForAcceptance ? "Resolved" :
                        card.accepted ? "Accepted" :
                            card.cancelled ? "Cancelled" : "InProgress";

                switch(status)
                {
                    case "ReadyForQA":
                        if(oldStatus == "InProgress") {
                            status = "InProgress";
                        }
                        break;
                    case "Resolved":
                        if(oldStatus == "InProgress") {
                            status = "InProgress";
                        }
                        else if(oldStatus == "ReadyForQA") {
                            status = "ReadyForQA";
                        }
                        break;
                    case "Accepted":
                        if(oldStatus == "InProgress") {
                            status = "InProgress";
                        }
                        else if(oldStatus == "ReadyForQA") {
                            status = "ReadyForQA";
                        }
                        else if(oldStatus == "Resolved") {
                            status = "Resolved";
                        }
                        break;
                    case "Cancelled":
                        if(oldStatus == "InProgress") {
                            status = "InProgress";
                        }
                        else if(oldStatus == "ReadyForQA") {
                            status = "ReadyForQA";
                        }
                        else if(oldStatus == "Resolved") {
                            status = "Resolved";
                        }
                        else if(oldStatus == "Accepted") {
                            status = "Accepted";
                        }
                        break;
                    default:
                }

                card.readyForQA = status == "ReadyForQA";
                card.readyForAcceptance = status == "Resolved";
                card.accepted = status == "Accepted";
                card.cancelled = status == "Cancelled";
                found = true;
            }
        }
        if(!found) {
            var remaining = summarySP - reportedSP;
            var card = { name: name, restSP: remaining, reportedSP: reportedSP, summarySP: summarySP};
            card.accepted = status == "Accepted";
            card.readyForAcceptance = status == "Resolved";
            card.readyForQA = status == "ReadyForQA";
            card.cancelled = status == "Cancelled";
            smeNames.push(card);
        }
    }

    function getTeamObj(teamName) {
        var teamobj = null;
        var teamNameCorrected = teamName;
        if(!$scope.showStreams){
            teamNameCorrected = getCleanTeamName(teamName);
        }
        for(var i=0; i<$scope.teamLoadData.length; i++) {
            var team = $scope.teamLoadData[i];
            if (team.name == teamNameCorrected) {
                teamobj = team;
            }
        }
        if (teamobj == null) {
            var team = {
                name: teamNameCorrected,
                versions: []
            };
            for(var i=0; i<$scope.showVersions.length; i++) {
                var version = $scope.showVersions[i];
                if(version == "Undefined") {
                    version = "";
                }
                team.versions.push( {name:version, done: 0, total: 0, smeNames: [], completed: false});
            }
            $scope.teamLoadData.push(team);
            teamobj = team;
        }
        return teamobj;
    }

    function getCleanTeamName(teamName) {
        var index = teamName.indexOf(":");
        if(index < 0) {
            return teamName;
        }

        return teamName.substring(0,index);
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
    $scope.onFilterQ1 = function() {
        $scope.reInitTotal();
        $scope.isTotalWasCalculated = false;
        $scope.processWithRowSpans();
    }
    $scope.onFilterQ2 = function() {
        $scope.reInitTotal();
        $scope.isTotalWasCalculated = false;
        $scope.processWithRowSpans();
    }

    $scope.onEstimatesButtonClick = function(){
        if(_.isUndefined($scope.moduleProgressData))
        {
            alert("Please, wait till data will be loaded");
            return;
        }

        if(!_.isEmpty(sessionStorage.estimationSettings))
        {
            $scope.estimation = JSON.parse(sessionStorage.estimationSettings);
            $('#myModal').modal({show:true});
            return;
        }

        $scope.estimation = {};
        $scope.estimation.stream = {};
        $scope.estimation.team = _.find($scope.allTeams,function(teamItem){return teamItem.name === $scope.filteredTeam});
        _.each($scope.estimation.team.streams, function(streamItem){
            var streamShortCut = $scope.estimation.team.name +":" + streamItem.replace("Stream","");
            $scope.estimation.stream[streamItem] = {};
            $scope.estimation.stream[streamItem].modules = _.sortBy(_.filter($scope.moduleProgressData.module, function(moduleItem){
                return moduleItem.teamnames[0] === streamShortCut;
            }), function(item){return item.duedate});

        });

        $('#myModal').modal({show:true});
    }

    $scope.onEstimationCalculateButton = function(){

        sessionStorage.estimationSettings = JSON.stringify($scope.estimation);

        _.each($scope.estimation.team.streams, function(streamItem){

            var previousDevModuleEndDate, previousQAModuleEndDate;
            _.each($scope.estimation.stream[streamItem].modules, function(moduleItem){
                moduleItem.devLeftWorkDays = ((moduleItem.summarySP - moduleItem.reportedSP) / $scope.estimation.dayDevSpVelocity) / $scope.estimation[streamItem+"DevCapacity"];
                moduleItem.qaLeftWorkDays = ((moduleItem.summarySP - moduleItem.reportedSP) / $scope.estimation.dayQaSpVelocity) / $scope.estimation[streamItem+"QACapacity"];

                previousDevModuleEndDate = previousDevModuleEndDate ?  previousDevModuleEndDate : new Date();
                moduleItem.endDevDate = new Date(previousDevModuleEndDate).addBusDays(moduleItem.devLeftWorkDays);

                previousQAModuleEndDate = previousQAModuleEndDate ?  previousQAModuleEndDate : moduleItem.endDevDate;
                moduleItem.endQADate = new Date(previousQAModuleEndDate).addBusDays(moduleItem.qaLeftWorkDays);

                moduleItem.endAccDate = moduleItem.qaLeftCustomDays ? new Date(moduleItem.endQADate).addBusDays(moduleItem.qaLeftCustomDays) : new Date(moduleItem.endQADate).addBusDays($scope.estimation.acceptanceDaysGap);


                previousDevModuleEndDate = moduleItem.endDevDate;
                previousQAModuleEndDate = moduleItem.endQADate;
            })
        });
    };


    $scope.onEstimationClearButton = function(){
        sessionStorage.removeItem("estimationSettings");
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

