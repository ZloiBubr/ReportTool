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
var _ = require('underscore');
var async = require('async');
var cache = require('node_cache');
var sessionsupport = require('../middleware/sessionsupport');
var helpers = require('../middleware/helpers');

var VERSION = require('../public/jsc/versions').VERSION;
var STATUS = require('../public/jsc/models/statusList').STATUS;

var JiraApi = require('jira').JiraApi;

var epicsList = [];
var issuesList = [];
var epicIssueMap = {};
var linkedIssueUniqList = [];
var updateInProgress = false;

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
        //step 4
        function (callback) {
            // process linked issues pages
            LogProgress("**** Step 4: process blockers");
            Step4ProcessBlockers(jira, callback);
        },
        //step 5
        function (callback) {
//            LogProgress("**** Step 5: Update End");
//            response.end();
            updateInProgress = false;
            callback();
        },
        //step 6
        function (callback) {
            WriteVersion(callback);
        },
        //step 7
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
    //var requestString = "project = PLEX-UXC AND key = PLEXUXC-9243"; // for debug
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
                            module.save(function () {
                                epicsList.push(epic.key);
                                LogProgress(epic.key + " : " + " Module Collected");
                                callback();
                            })
                        });
                    },
                    function (err) {
                        if (err) {
                            LogProgress("Collect modules error happened!", err);
                        }
                        LogProgress(epicsList.length + " : " + " Modules Collected");
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
            LogProgress("Restarting Loop");
        }
        callback(err);
    });
}

function Step2CollectPages(jira, full, callback) {
    issuesList = [];
    epicIssueMap = {};

    async.eachLimit(epicsList, 10, function (epic, callback) {
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
    var counter = 0;
    var lastProgress = 0;
    linkedIssueUniqList = {};

    async.eachLimit(issuesList, 10, function (issueKey, callback) {
            var currentProgress = Math.floor((++counter * 100) / issuesList.length);
            if (lastProgress != currentProgress) {
                lastProgress = currentProgress;
                UpdateProgress(currentProgress, "page");
            }
            ProcessPageFromJira(jira, issueKey, counter, callback);
        },
        function (err) {
            callback();
        }
    );
}

function Step4ProcessBlockers(jira, callback) {
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

function CollectPagesFromJira(jira, full, moduleKey, callback) {
    var queryString = full ?
        util.format("project = PLEXUXC AND issuetype = Story AND 'Epic Link' in (%s)", moduleKey) :
        util.format("project = PLEXUXC AND issuetype = Story AND 'Epic Link' in (%s) AND updated > -3d", moduleKey);

    var loopError = true;
    async.whilst(function() {
            return loopError;
        },
        function(callback) {
            LogProgress("**** collect pages for module: " + moduleKey);
            jira.searchJira(queryString, { fields: ["summary"] }, function (error, stories) {
                if (error) {
                    LogProgress("Collect pages error happened!", error);
                    LogProgress("Restarting Loop for: "+moduleKey, error);
                    callback();
                }
                if (stories != null) {
                    async.eachSeries(stories.issues, function (story, callback) {
                            issuesList.push(story.key);
                            epicIssueMap[story.key] = moduleKey;
                            callback();
                        },
                        function (err) {
                            if (err) {
                                LogProgress("Restarting Loop for:"+story.key, err);
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
            LogProgress(moduleKey + " : " + " : Page Collected");
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
                        }
                        ProcessLinkedIssues(issue, dbPage);
                        loopError = false;
                        callback();
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

function ProcessLinkedIssues(issue, dbPage) {
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
                    SaveLinkedIssue(jiraLinkedIssue, counter, callback);
                }
                else {
                    loopError = false;
                    callback();
                }
            });
        },
        function(err) {
            LogProgress(counter + ":" + linkedIssue.linkedIssueKey + " : Issue Collected");
            callback();
        }
    );
}

function SaveLinkedIssue(linkedIssue, counter, callback) {
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
            "worklog",
            "status",
            "customfield_24500", //dev finish date
            "customfield_24501", //qa finish date
            "customfield_24502", //estimated acceptance date
            "customfield_24503"  //customer complete date
        ] }, function (error, subtasks) {
            if (error) {
                callback(error);
            }
            if (subtasks != null) {
                async.eachSeries(subtasks.issues, function (subtask, callback) {
                        if (subtask != null) {
                            if(helpers.isParentPage(page.labels) && subtask.fields.summary.indexOf('PLEX-Acceptance') > -1) {
                                page.devfinish = subtask.fields.customfield_24500 ? new Date(subtask.fields.customfield_24500) : null;
                                page.qafinish = subtask.fields.customfield_24501 ? new Date(subtask.fields.customfield_24501) : null;
                                page.accfinish = subtask.fields.customfield_24502 ? new Date(subtask.fields.customfield_24502) : null;
                                page.cusfinish = subtask.fields.customfield_24503 ? new Date(subtask.fields.customfield_24503) : null;
                            }
                            calcWorklogFromIssue(subtask, page);
                            if(subtask.fields.summary.indexOf("PLEX-Acceptance") > -1) {
                                if(subtask.fields.status.name == STATUS.CLOSED.name) {
                                    page.status = STATUS.PRODUCTION.name;
                                }
                                page.acceptanceStatus = subtask.fields.status.name;
                            }
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









