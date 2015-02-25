/**
 * Created by Siarhei Hladkou (shladkou) on 2/26/14.
 */
var util = require('util');
var config = require('../config');
var log = require('../libs/log')(module);
var Module = require('../models/module').Module;
var Page = require('../models/page').Page;
var Version = require('../models/Version').Version;
var Issue = require('../models/issue').Issue;
var CloudApp = require('../models/cloudApp').CloudApp;
var _ = require('underscore');
var async = require('async');
var cache = require('node_cache');
var sessionsupport = require('../middleware/sessionsupport');
var helpers = require('../middleware/helpers');

var VERSION = require('../public/jsc/versions').VERSION;
var STATUS = require('../public/jsc/models/statusList').STATUS;

var JiraApi = require('jira').JiraApi;

var epicsList = {};
var issuesList = [];
var acceptanceTasks = {};
var epicIssueMap = {};
var linkedIssueUniqList = [];
var pagesProgressCount = 0;
var updateInProgress = false;

var progressCounter = 0;
var lastProgress = 0;

exports.rememberResponse = function (req, res) {
    sessionsupport.setResponseObj('updateDb', req, res);
    UpdateProgress(0, "page");
    UpdateProgress(0, "issues");
};

var UpdateProgress = function (progress, type) {
    sessionsupport.notifySubscribers('updateDb', "progress", '{"' + type + '":' + progress.toString() + "}");
    if (progress > 0) {
        LogProgress("**********" + type + " Progress " + progress.toString() + "% **********");
    }
};

var LogProgress = function (text, error) {
    if (error) {
        var errorText = error == null ? "not evaluated" : error.message == null ? error : error.message;
        sessionsupport.notifySubscribers('updateDb', "errmessage", text + ", reason - " + errorText);
        log.error(text);
        log.error(error);
    }
    else {
        sessionsupport.notifySubscribers('updateDb', "logmessage", text);
        log.info(text);
    }
};

exports.updateJiraInfo = function (full, jiraUser, jiraPassword, callback) {
    if (updateInProgress) {
        callback();
    }

    updateInProgress = true;

    LogProgress("**** Step 0: async processing");

    var jira = new JiraApi(config.get("jiraAPIProtocol"), config.get("jiraUrl"), config.get("jiraPort"), jiraUser, jiraPassword, '2');

    async.series([
        //step 1
        function (callback) {
            //grab all modules
            LogProgress("**** Step 1: collect modules");
            Step1CollectModules(jira, callback);
        },
        //step 2-1
        function (callback) {
            LogProgress("**** Step 2-1: collect pages");
            //grab pages list
            Step2CollectPages(jira, full, callback);
        },
        //step 2-2
        function (callback) {
            LogProgress("**** Step 2-2: collect automation stories");
            //grab automation pages list
            Step2CollectAutomationStories(jira, full, callback);
        },
        //step 3
        function (callback) {
            //process pages
            LogProgress("**** Step 3: process " + issuesList.length + " pages");
            Step3ProcessPages(jira, callback);
        },
        //step 5
        function (callback) {
            // clear cache to not wait for other issues collected
            cache.clearAllData();
            // process linked issues pages
            LogProgress("**** Step 4: process acceptance tasks");
            Step4ProcessCloudApps(jira, callback);
        },
        //step 5
        function (callback) {
            // process linked issues pages
            LogProgress("**** Step 5: process blockers");
            Step5ProcessBlockers(jira, callback);
        },

        //step 6
        function (callback) {
//            LogProgress("**** Step 5: Update End");
//            response.end();
            updateInProgress = false;
            callback();
        },
        //step 7
        function (callback) {
            WriteVersion(callback);
        },
        //step 8
        function (callback) {
            LogProgress("**** Update Finished ****");
            cache.clearAllData();
            callback();
        }
    ],
    //optional callback
    function(err) {
        if(err) {
            LogProgress("**** Update Failed ****", err);
        }
        else {
            LogProgress("**** Update Succeed ****");
        }
    }
    );
    callback();
};

function WriteVersion(callback) {
    Version.findOne({ numerical: VERSION.NUMBER }, function (err, version) {
        if (err) {
            callback(err);
        }

        if (!version) {
            version = new Version();
            version.numerical = VERSION.NUMBER;
            version.name = VERSION.NAME;
        }
        version.updated = new Date(Date.now());
        version.save(function (err, page) {
            callback(err, page);
        });
    });
}

function Step1CollectModules(jira, callback) {
    var requestString = "project = PLEX-UXC AND issuetype = epic AND summary ~ Module AND NOT summary ~ automation AND NOT summary ~ screens ORDER BY key ASC";
    //var requestString = "project = PLEX-UXC AND key = PLEXUXC-17040"; // for debug
    epicsList = [];

    UpdateProgress(0, "page");
    UpdateProgress(0, "issues");

    var loopError = true;
    async.whilst(function() {
            return loopError;
        },
        function(callback) {
        jira.searchJira(requestString, {
            fields: [
                "summary",
                "duedate",
                "assignee",
                "status",
                "resolution",
                "labels",
                "fixVersions",
                "priority",
                "customfield_24500", //dev finish date
                "customfield_24501", //qa finish date
                "customfield_24502", //estimated acceptance date
                "customfield_24503"  //customer complete date
            ] }, function (error, epics) {
            if (error) {
                callback(error);
            }
            if (epics != null) {
                async.eachSeries(epics.issues, function (epic, callback) {
                        Module.findOne({ key: epic.key }, function (err, module) {
                            if (!module) {
                                module = new Module();
                            }
                            module.key = epic.key;
                            module.summary = epic.fields.summary;
                            module.duedate = epic.fields.duedate == null ? null : new Date(epic.fields.duedate);
                            module.devfinish = epic.fields.customfield_24500 == null ? null : new Date(epic.fields.customfield_24500);
                            module.qafinish = epic.fields.customfield_24501 == null ? null : new Date(epic.fields.customfield_24501);
                            module.accfinish = epic.fields.customfield_24502 == null ? null : new Date(epic.fields.customfield_24502);
                            module.cusfinish = epic.fields.customfield_24503 == null ? null : new Date(epic.fields.customfield_24503);
                            module.assignee = epic.fields.assignee == null ? "Unassigned" : epic.fields.assignee.name;
                            module.status = epic.fields.status.name;
                            module.resolution = epic.fields.resolution == null ? "" : epic.fields.resolution.name;
                            module.labels = epic.fields.labels;
                            module.fixVersions = epic.fields.fixVersions && epic.fields.fixVersions.length > 0 ? epic.fields.fixVersions[0].name : "";
                            module.priority = epic.fields.priority.name;
                            module.save(function (err, moduleDb) {
                                epicsList[epic.key] = {id: moduleDb._id, key: epic.key};
                                LogProgress(epic.key + " : " + " Module Collected");
                                callback();
                            })
                        });
                    },
                    function (err) {
                        if (err) {
                            LogProgress("Collect modules error happened!", err);
                        }
                        LogProgress(Object.keys(epicsList).length + " : " + " Modules Collected");
                        if(err == null) {
                            loopError = false;
                        }
                        callback(err);
                    });
            }
            else {
                callback();
            }
        });
    },
    function(err) {
        if(err) {
            if(err === '401: Unauthorized Error'){
                LogProgress(err);
                throw new Error(err);
            }
            else if(err === '403: Forbidden'){
                var message = "403: Forbidden, seems you was blocked by EPAM domain system or you need logout and login again in jira( https://jira.epam.com )";
                LogProgress(message);
                throw new Error(message);
            }
            LogProgress('Restarting Loop');
        }
        callback(err);
    });
}

function Step2CollectPages(jira, full, callback) {
    issuesList = [];
    epicIssueMap = {};

    async.eachLimit(Object.keys(epicsList), 10, function (epic, callback) {
            CollectPagesFromJira(jira, full, epic, callback);
        },
        function (err) {
            callback(err);
        }
    );
}

function Step2CollectAutomationStories(jira, full, callback) {
    var queryString = "project = PLEXUXC AND issuetype = Story AND ((labels in (Automation) AND status not in (Open)) OR ('Epic Link' = 'Automation test data fixing'))";

    if(!full) {
        queryString += " AND updated > -3d";
    }

    var loopError = true;
    async.whilst(function() {
            return loopError;
        },
        function(callback) {
            LogProgress("**** collect automation stories");
            jira.searchJira(queryString, { fields: ["summary"] }, function (error, stories) {
                if (error) {
                    LogProgress("Collect automation stories error happened!", error);
                    LogProgress("Restarting Loop", error);
                    callback();
                }
                if (stories != null) {
                    async.eachSeries(stories.issues, function (story, callback) {
                            pagesProgressCount++;
                            issuesList.push(story.key);
                            //epicIssueMap[story.key] = moduleKey;
                            callback();
                        },
                        function (err) {
                            if (err) {
                                LogProgress("Restarting Loop for: "+story.key, err);
                            }
                            else {
                                loopError = false;
                            }
                            callback();
                        }
                    );
                }
                else {
                    loopError = false;
                    callback();
                }
            });
        },
        function(err) {
            LogProgress("Automation Stories Collected");
            callback();
        }
    );
}

function Step3ProcessPages(jira, callback) {
    linkedIssueUniqList = {};

    async.eachLimit(issuesList, 10, function (issueKey, callback) {
            var currentProgress = Math.floor((++progressCounter * 100) / pagesProgressCount);
            if (lastProgress != currentProgress) {
                lastProgress = currentProgress;
                UpdateProgress(currentProgress, "page");
            }
            ProcessPageFromJira(jira, issueKey, progressCounter, callback);
        },
        function (err) {
            callback();
        }
    );
}

function Step4ProcessCloudApps(jira, callback) {
    async.eachLimit(Object.keys(acceptanceTasks), 10, function (acceptanceTaskKey, callback) {
            var currentProgress = Math.floor((++progressCounter * 100) / pagesProgressCount);
            var acceptanceTask = acceptanceTasks[acceptanceTaskKey];
            if (lastProgress != currentProgress) {
                lastProgress = currentProgress;
                UpdateProgress(currentProgress, "page");
            }

            ProcessAcceptanceTasksFromJira(jira, acceptanceTask, progressCounter, callback)
        },
        function (err) {
            callback();
        }
    );
}

function Step5ProcessBlockers(jira, callback) {
    var counter = 0;
    var lastProgress = 0;
    var keys = Object.keys(linkedIssueUniqList);
    async.eachLimit(keys, 10, function (linkedIssueKey, callback) {
            var currentProgress = Math.floor((++counter * 100) / keys.length);
            if (lastProgress != currentProgress) {
                lastProgress = currentProgress;
                UpdateProgress(currentProgress, "issues");
            }
            var linkedIssue = linkedIssueUniqList[linkedIssueKey];
            ProcessBlockersFromJira(jira, linkedIssue, counter, callback);
        },
        function (err) {
            callback();
        }
    );
}

function CollectPagesFromJira(jira, full, epicKey, callback) {
    var queryString = full ?
        util.format("project = PLEXUXC AND issuetype = Story AND 'Epic Link' in (%s)", epicKey) :
        util.format("project = PLEXUXC AND issuetype = Story AND 'Epic Link' in (%s) AND updated > -3d", epicKey);

    var loopError = true;
    async.whilst(function() {
            return loopError;
        },
        function(callback) {
            LogProgress("**** collect pages for module: " + epicKey);
            jira.searchJira(queryString, { fields: ["summary","subtasks"] }, function (error, stories) {
                if (error) {
                    LogProgress("Collect pages error happened!", error);
                    LogProgress("Restarting Loop for: "+epicKey, error);
                    callback();
                }
                if (stories != null) {

                    _.each(stories.issues, function (story){
                        issuesList.push(story.key);
                        pagesProgressCount++;
                        epicIssueMap[story.key] = epicKey;

                        if(story.fields && story.fields.subtasks && story.fields.subtasks.length > 0){
                            for(var i=0;i<story.fields.subtasks.length;i++){
                                if(story.fields.subtasks[i].fields && story.fields.subtasks[i].fields.summary.toLowerCase().indexOf("plex-acceptance") != -1){
                                    acceptanceTasks[story.key] = {
                                        id: story.fields.subtasks[i].id,
                                        key: story.fields.subtasks[i].key
                                    };
                                    pagesProgressCount++;
                                }
                            }
                        }
                    });
                    loopError = false;
                    callback();
                }
                else{
                    loopError = false;
                    callback();
                }
            });
        },
        function(err) {
            LogProgress(epicKey + " : " + " : Page Collected");
            callback();
        }
    );
}

function ProcessPageFromJira(jira, issueKey, counter, callback) {
    var loopError = true;
    async.whilst(function() {
            return loopError;
        },
        function(callback) {
            jira.findIssue(issueKey + "?expand=changelog", function (error, issue) {
                if (error) {
                    LogProgress("Collect pages error happened!", error);
                    LogProgress("Restarting Loop for: "+issueKey, error);
                    callback();
                }
                else if (issue != null) {
                    SavePage(jira, issue, function (error, dbPage) {
                        if (error) {
                            LogProgress("Restarting Loop for:"+issueKey, error);
                            callback();
                        }else {
                            MapLinkedIssues(issue, dbPage);
                            MapAcceptanceTasks(issue, dbPage);
                            loopError = false;
                            callback();
                        }
                    });
                }
                else {
                    loopError = false;
                    callback();
                }
            });
        },
        function(err) {
            LogProgress(counter + ":" + issueKey + " : Page Collected");
            callback();
        }
    );
}

function ProcessAcceptanceTasksFromJira(jira, acceptanceTasks, counter, callback) {
    var loopError = true;
    async.whilst(function() {
            return loopError;
        },
        function(callback) {
            jira.findIssue(acceptanceTasks.id, function (error, jiraAcceptanceTask) {
                if (error) {
                    LogProgress("Collect acceptance tasks error happened!", error);
                    LogProgress("Restarting Loop for:"+jiraAcceptanceTask.key, error);
                    callback();
                }
                else if(jiraAcceptanceTask != null) {
                    loopError = false;
                    SaveAcceptanceTask(jiraAcceptanceTask, acceptanceTasks, callback);
                }
                else {
                    loopError = false;
                    callback();
                }
            });
        },
        function(err) {
            LogProgress(counter + ":" + acceptanceTasks.key + " : Acceptance Task Collected");
            callback();
        }
    );
}



function MapLinkedIssues(issue, dbPage) {
    if(dbPage != null) {
        _.each(issue.fields.issuelinks, function (linkedIssueItem) {
            var linkedIssue = linkedIssueItem.inwardIssue ? linkedIssueItem.inwardIssue : linkedIssueItem.outwardIssue;
            if (linkedIssue.fields.issuetype.name != "Story") {
                if (_.isUndefined(linkedIssueUniqList[linkedIssue.key])) {
                    linkedIssueUniqList[linkedIssue.key] = {
                        linkedIssueKey: linkedIssue.key,
                        linkedPages: [
                            {
                                key: issue.key,
                                _id: dbPage._id,
                                linkType: linkedIssueItem.type.inward
                            }
                        ]
                    };
                } else {
                    linkedIssueUniqList[linkedIssue.key].linkedPages.push({
                        key: issue.key,
                        _id: dbPage._id,
                        linkType: linkedIssueItem.type.inward});
                }
            }
        });
    }
}

function MapAcceptanceTasks(issue, dbPage) {
    var acceptanceTask = acceptanceTasks[issue.key];
    if(acceptanceTask) {
        acceptanceTask.epicKey = dbPage.epicKey;
        acceptanceTask.parentPageId = dbPage._id;
        acceptanceTask.epicId = epicsList[dbPage.epicKey].id;
    }
}

function ProcessBlockersFromJira(jira, linkedIssue, counter, callback) {
    var loopError = true;
    async.whilst(function() {
            return loopError;
        },
        function(callback) {
            jira.findIssue(linkedIssue.linkedIssueKey, function (error, jiraLinkedIssue) {
                if (error) {
                    LogProgress("Collect issues error happened!", error);
                    LogProgress("Restarting Loop for:"+linkedIssue.linkedIssueKey, error);
                    callback();
                }
                else if(jiraLinkedIssue != null) {
                    loopError = false;
                    SaveLinkedIssue(jiraLinkedIssue, callback);
                }
                else {
                    loopError = false;
                    callback();
                }
            });
        },
        function(err) {
            LogProgress(counter + ":" + linkedIssue.linkedIssueKey + " : Issue Collected");
            callback(err);
        }
    );
}
function SaveAcceptanceTask(jiraAcceptanceTask, mapAcceptanceTask, callback) {
        CloudApp.findOne({key: mapAcceptanceTask.key}, function (err, dbIssue) {
        if (err) {
            callback(err);
        }

        if (!dbIssue) {
            dbIssue = new CloudApp();
        }

        dbIssue.key = jiraAcceptanceTask.key;
        dbIssue.uri = "https://jira.epam.com/jira/browse/" + jiraAcceptanceTask.key;
        dbIssue.type = jiraAcceptanceTask.fields.issuetype.name;
        dbIssue.summary = jiraAcceptanceTask.fields.summary;
        dbIssue.status = jiraAcceptanceTask.fields.status.name;
        dbIssue.resolution = jiraAcceptanceTask.fields.resolution == null ? "" : jiraAcceptanceTask.fields.resolution.name;
        dbIssue.reporter = jiraAcceptanceTask.fields.reporter.displayName;

        dbIssue.created = jiraAcceptanceTask.fields.created;
        dbIssue.updated = jiraAcceptanceTask.fields.updated;

        dbIssue.dev_complete = jiraAcceptanceTask.fields.customfield_24500;
        dbIssue.qa_complete= jiraAcceptanceTask.fields.customfield_24501;
        dbIssue.sme_complete = jiraAcceptanceTask.fields.customfield_24502;
        dbIssue.plex_complete = jiraAcceptanceTask.fields.customfield_24503;
        dbIssue.duedate = jiraAcceptanceTask.fields.duedate;

        dbIssue.labels = jiraAcceptanceTask.fields.labels;
        if (jiraAcceptanceTask.fields.assignee != null)
            dbIssue.assignee = jiraAcceptanceTask.fields.assignee.displayName;

        dbIssue.epicKey = mapAcceptanceTask.epicKey;
        dbIssue._parentPage = mapAcceptanceTask.parentPageId;
        dbIssue._epic = mapAcceptanceTask.epicId;

            dbIssue.save(function (err) {
            callback(err);
        });
    });
}


function SaveLinkedIssue(linkedIssue, callback) {
    Issue.findOne({key: linkedIssue.key}, function (err, dbIssue) {
        if (err) {
            callback(err);
        }

        if (!dbIssue) {
            dbIssue = new Issue();
        }

        dbIssue.key = linkedIssue.key;
        dbIssue.uri = "https://jira.epam.com/jira/browse/" + linkedIssue.key;
        dbIssue.type = linkedIssue.fields.issuetype.name;
        dbIssue.summary = linkedIssue.fields.summary;
        dbIssue.status = linkedIssue.fields.status.name;
        dbIssue.resolution = linkedIssue.fields.resolution == null ? "" : linkedIssue.fields.resolution.name;
        dbIssue.reporter = linkedIssue.fields.reporter.displayName;
        dbIssue.originalEstimate = linkedIssue.fields.timetracking.originalEstimate;
        dbIssue.timeSpent = linkedIssue.fields.timetracking.timeSpent;

        dbIssue.created = linkedIssue.fields.created;
        dbIssue.updated = linkedIssue.fields.updated;

        dbIssue.labels = linkedIssue.fields.labels;
        if (linkedIssue.fields.assignee != null)
            dbIssue.assignee = linkedIssue.fields.assignee.displayName;

        dbIssue.pages = [];
        _.each(linkedIssueUniqList[linkedIssue.key].linkedPages, function (linkedPage) {
            dbIssue.pages.push({linkType: linkedPage.linkType, page: linkedPage._id});
        });

        dbIssue.save(function (err) {
            callback(err);
        });
    });
}


function SavePage(jira, issue, callback) {
    Page.findOne({ key: issue.key }, function (err, page) {
        if (err) {
            callback(err);
        }

        if (!page) {
            page = new Page();
        }
        page.key = issue.key;
        page.uri = "https://jira.epam.com/jira/browse/" + issue.key;
        page.summary = issue.fields.summary;
        page.status = issue.fields.status.name;
        page.resolution = issue.fields.resolution == null ? "" : issue.fields.resolution.name;
        page.reporter = issue.fields.reporter.displayName;
        page.originalEstimate = issue.fields.timetracking.originalEstimate;
        page.timeSpent = issue.fields.timetracking.timeSpent;
        page.labels = issue.fields.labels;
        if (issue.fields.assignee != null)
            page.assignee = issue.fields.assignee.displayName;
        page.storyPoints = issue.fields.customfield_10004;
        page.blockers = issue.fields.customfield_20501;
        page.progress = issue.fields.customfield_20500;
        page.epicKey = epicIssueMap[issue.key];
        page.created = issue.fields.created;
        page.updated = issue.fields.updated;
        page.testingProgress = issue.fields.customfield_24700;
        page.checklistCreated = issue.fields.customfield_24300 ? issue.fields.customfield_24300[0].value == 'yes' ? true : false : false;
        parseHistory(issue, page);
        calcWorklogFromIssue(issue, page);
        var queryString = util.format("project = PLEXUXC AND parent in (%s)", issue.key);
        jira.searchJira(queryString, { fields: [
            "summary",
            "assignee",
            "worklog",
            "status",
            "customfield_24500", //dev finish date
            "customfield_24501", //qa finish date
            "customfield_24502", //estimated acceptance date
            "customfield_24503", //plex dev complete date
            "customfield_25900", //pm hanfoff complete date
            "customfield_25901"  //la ready date
        ] }, function (error, subtasks) {
            if (error) {
                callback(error);
            }
            if (subtasks != null) {
                async.eachSeries(subtasks.issues, function (subtask, callback) {
                        if (subtask != null) {
                            if(subtask.fields.summary.indexOf('PLEX-Acceptance') > -1) {
                                page.devfinish = subtask.fields.customfield_24500 ? new Date(subtask.fields.customfield_24500) : null;
                                page.qafinish = subtask.fields.customfield_24501 ? new Date(subtask.fields.customfield_24501) : null;
                                page.accfinish = subtask.fields.customfield_24502 ? new Date(subtask.fields.customfield_24502) : null;
                                page.cusfinish = subtask.fields.customfield_24503 ? new Date(subtask.fields.customfield_24503) : null;
                                page.pmhfinish = subtask.fields.customfield_25900 ? new Date(subtask.fields.customfield_25900) : null;
                                page.lafinish = subtask.fields.customfield_25901 ? new Date(subtask.fields.customfield_25901) : null;
                                if(subtask.fields.status.name == STATUS.CLOSED.name) {
                                    page.status = STATUS.PRODUCTION.name;
                                }
                                page.acceptanceStatus = subtask.fields.status.name;
                                page.acceptanceKey = subtask.key;
                                page.acceptanceAssignee = subtask.fields.assignee ? subtask.fields.assignee.name : "";
                            }
                            calcWorklogFromIssue(subtask, page);
                            callback();
                        }
                    },
                    function (err) {
                        if (err) {
                            callback(err);
                        }
                        else {
                            page.save(function (err, page) {
                                callback(err, page);
                            });
                        }
                    });
            }
            else {
                callback();
            }
        })
    });
}

function ParseProgress(item, page, author, created) {
    if (item.fieldtype == 'custom' && (item.field == 'Progress' || item.field == "Progress, %")) {
        var from = item.fromString == null ||
            item.fromString == undefined ||
            item.fromString == ''
            ?
            '0' : item.fromString;
        var to = item.toString;

        if (page.progressHistory == null) {
            page.progressHistory = [
                {
                    person: author,
                    progressFrom: from,
                    progressTo: to,
                    dateChanged: new Date(created)
                }
            ];
        }
        else {
            //look if already exists
            var recordFound = false;
            for (var o = 0; o < page.progressHistory.length; o++) {
                var record = page.progressHistory[o];
                if (record.person == author &&
                    record.progressFrom == from &&
                    record.progressTo == to &&
                    record.dateChanged.getTime() == new Date(created).getTime()) {
                    recordFound = true;
                    break;
                }
            }
            if (!recordFound) {
                page.progressHistory.push({
                    person: author,
                    progressFrom: from,
                    progressTo: to,
                    dateChanged: new Date(created)
                });
            }
        }
    }
}

function ParseFinishDates(item, page, created) {
    if (item.fieldtype == 'jira' && item.field == 'status') {
        var from = item.fromString;
        var to = item.toString;

        if (from == STATUS.INPROGRESS.name && to == STATUS.READYFORQA.name && page.devFinished == null ||
            from == STATUS.CODEREVIEW.name && to == STATUS.READYFORQA.name && page.devFinished == null) {
            page.devFinished = created;
        }
        if (from == STATUS.TESTINGINPROGRESS.name && to == STATUS.RESOLVED.name) {
            page.qaFinished = created;
        }
    }
}

function parseHistory(issue, page) {
    for (var i = 0; i < issue.changelog.total; i++) {
        var history = issue.changelog.histories[i];
        var author = history.author.displayName;
        for (var y = 0; y < history.items.length; y++) {
            var item = history.items[y];
            ParseProgress(item, page, author, history.created);
            ParseFinishDates(item, page, history.created);
        }
    }
}

function calcWorklogFromIssue(issue, page) {
    if (issue.fields.worklog) {
        for (var i = 0; i < issue.fields.worklog.worklogs.length; i++) {
            var worklog = issue.fields.worklog.worklogs[i];
            var author = worklog.author.displayName;
            var timeSpent = worklog.timeSpentSeconds / 3600;

            if (page.worklogHistory == null) {
                page.worklogHistory = [
                    {
                        person: author,
                        timeSpent: timeSpent,
                        dateChanged: new Date(worklog.created),
                        dateStarted: new Date(worklog.started)
                    }
                ];
            }
            else {
                //look if already exists
                var recordFound = false;
                for (var o = 0; o < page.worklogHistory.length; o++) {
                    var record = page.worklogHistory[o];
                    if (record.person == author &&
                        record.timeSpent == timeSpent &&
                        record.dateChanged.getTime() == new Date(worklog.created).getTime() &&
                        record.dateStarted.getTime() == new Date(worklog.started).getTime()) {
                        recordFound = true;
                        break;
                    }
                }
                if (!recordFound) {
                    page.worklogHistory.push({
                        person: author,
                        timeSpent: timeSpent,
                        dateChanged: new Date(worklog.created),
                        dateStarted: new Date(worklog.started)
                    });
                }
            }
        }
    }
}









