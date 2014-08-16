/**
 * Created by Siarhei Hladkou (shladkou) on 2/26/14.
 */
var util = require('util');
var config = require('../config');
var log = require('../libs/log')(module);
var Module = require('../models/module').Module;
var Page = require('../models/page').Page;
var Issue = require('../models/issue').Issue;
var _ = require('underscore');
var async = require('async');

var JiraApi = require('jira').JiraApi;
var response = null;

var epicsList = [];
var issuesList = [];
var epicIssueMap = {};
var linkedIssueUniqList = [];
var updateInProgress = false;

exports.rememberResponse = function (res) {
    response = res;
    UpdateProgress(0, "page");
    UpdateProgress(0, "issues");
};

var UpdateProgress = function (progress, type) {
    if(response != null) {
        response.write("event: progress\n");
        response.write('data: {"' + type + '":' + progress.toString() + '}\n\n');
    }
    if (progress > 0) {
        LogProgress("**********" + type + " Progress " + progress.toString() + "% **********");
    }
};

var LogProgress = function (text, error) {
    if (response && error == null) {
        response.write("event: logmessage\n");
        response.write("data: " + text + "\n\n");
    }
    if (error) {
        log.error(text);
        log.error(error);
        if (response) {
            response.write("event: errmessage\n");
            var errorText = error == null ? "" : error.message;
            response.write("data: " + text + ", reason - " + errorText + "\n\n");
        }
    }
    else {
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
        //step 2
        function (callback) {
            LogProgress("**** Step 2: collect pages");
            //grab pages list
            Step2CollectPages(jira, full, callback);
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
            LogProgress("**** Step 4: process " + linkedIssueUniqList.length + " blockers");
            Step4ProcessBlockers(jira, callback);
        },
        //step 5
        function (callback) {
            LogProgress("**** Step 5: Update End");
            response.end();
            updateInProgress = false;
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

function Step1CollectModules(jira, callback) {
    var requestString = "project = PLEX-UXC AND issuetype = epic AND summary ~ Module AND NOT summary ~ automation ORDER BY key ASC";
    epicsList = [];

    UpdateProgress(0, "page");
    UpdateProgress(0, "issues");

    var loopError = true;
    async.whilst(function() {
            return loopError;
        },
        function(callback) {
        jira.searchJira(requestString, { fields: ["summary", "duedate", "assignee"] }, function (error, epics) {
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
                            module.assignee = epic.fields.assignee == null ? "Unassigned" : epic.fields.assignee.name;
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
            callback(err);
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
            callback(err);
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
                if (error || jiraLinkedIssue == null) {
                    LogProgress("Collect issues error happened!", error);
                    LogProgress("Restarting Loop for:"+linkedIssue.linkedIssueKey, error);
                }
                else {
                    SaveLinkedIssue(jiraLinkedIssue, counter, callback);
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
            LogProgress(counter + ":" + linkedIssue.key + " : Issue Collected");
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
        parseHistory(issue, page);
        calcWorklogFromIssue(issue, page);
        var queryString = util.format("project = PLEXUXC AND parent in (%s)", issue.key);
        jira.searchJira(queryString, { fields: ["summary", "worklog"] }, function (error, subtasks) {
            if (error) {
                callback(error);
            }
            if (subtasks != null) {
                async.eachSeries(subtasks.issues, function (subtask, callback) {
                        if (subtask != null) {
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
    if (item.fieldtype == 'custom' && item.field == 'Progress') {
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

        if (from == "In Progress" && to == "Ready for QA" &&
            page.devFinished == null) {
            page.devFinished = created;
        }
        if (from == "Testing in Progress" && to == "Resolved") {
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
        for (var i = 0; i < issue.fields.worklog.total; i++) {
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









