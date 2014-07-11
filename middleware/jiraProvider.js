/**
 * Created by Siarhei Hladkou (shladkou) on 2/26/14.
 */
var util = require('util');
var config = require('../config');
var log = require('../libs/log')(module);
var Module = require('../models/module').Module;
var Page = require('../models/page').Page;
var _ = require('underscore');
var async = require('async');

var JiraApi = require('jira').JiraApi;
var response = null;

var epicsList = [];
var issuesList = [];
var epicIssueMap = {};
var brokenPagesList = [];
var updateInProgress = false;

var _jiraUser = "";
var _jiraPass = "";

exports.rememberResponse = function (res) {
    response = res;
    UpdateProgress(0);
};

var UpdateProgress = function (progress) {
    response.write("event: progress\n");
    response.write("data: " + progress.toString() + "\n\n");
    if (progress > 0) {
        LogProgress("********** Progress " + progress.toString() + "% **********");
    }
};

var LogProgress = function (text, error) {
    if (response) {
        response.write("event: logmessage\n");
        response.write("data: " + text + "\n\n");
    }
    if (error) {
        log.error(text);
        log.error(error);
    }
    else {
        log.info(text);
    }
};

exports.updateJiraInfo = function (full, jiraUser, jiraPassword, callback) {
    if(updateInProgress) {
        callback();
    }

    _jiraUser = jiraUser;
    _jiraPass = jiraPassword;

    issuesList = [];
    epicsList = [];
    epicIssueMap = {};
    updateInProgress = true;

    var counter = 0;
    var lastProgress = 0;
    brokenPagesList = [];

    LogProgress("**** async");
    async.series([
            function (callback) {
                //grab all modules
                LogProgress("**** async collect modules");
                CollectModules(callback);
            },
            function (callback) {
                //grab pages list
                async.eachLimit(epicsList, 10, function (epic, callback2) {
                        LogProgress("**** async collect pages for module: " + epic);
                        CollectPages(full, epic, callback2);
                    },
                    function (err) {
                        if (err) {
                            LogProgress("!!!!!!!!!!!!!!!!!!!! Collecting pages error happened!", err);
                            callback(err);
                        }
                        callback();
                    }
                )
            },
            function (callback) {
                //process pages
                LogProgress("**** async process pages");
                async.eachLimit(issuesList, 5, function (issue, callback2) {
                        var currentProgress = Math.floor((++counter*100)/issuesList.length);
                        if(lastProgress != currentProgress) {
                            lastProgress = currentProgress;
                            UpdateProgress(currentProgress);
                        }
                        LogProgress("**** async process page: " + issue);
                        ProcessPage(issue, callback2);
                    },
                    function (err) {
                        if (err) {
                            LogProgress("!!!!!!!!!!!!!!!!!!!! Processing pages error happened!", err);
                        }
                        callback();
                    }
                )
            },
            function (callback) {
                //reprocess pages
                if(brokenPagesList.length > 0) {
                    LogProgress("**** async reprocess pages");
                    async.eachSeries(brokenPagesList, function (issue, callback2) {
                            LogProgress("**** async process page: " + issue);
                            ProcessPage(issue, callback2);
                        },
                        function (err) {
                            if (err) {
                                LogProgress("!!!!!!!!!!!!!!!!!!!! Reprocessing pages error happened!", err);
                            }
                            callback();
                        }
                    )
                }
                else {
                    callback();
                }
            }
        ],
        function (err) {
            if (err) {
                LogProgress("!!!!!!!!!!!!!!!!!!!! Update failed!", err);
            }
            else {
                LogProgress("Update finished successfully!", err);
            }
            response.end();
            updateInProgress = false;
        });
    callback();
};

function CollectModules(callback) {
    var requestString = "project = PLEX-UXC AND issuetype = epic AND summary ~ Module AND NOT summary ~ automation ORDER BY key ASC";

    UpdateProgress(1);

    var jira = new JiraApi(config.get("jiraAPIProtocol"), config.get("jiraUrl"), config.get("jiraPort"), _jiraUser, _jiraPass, '2');
    jira.searchJira(requestString, null, function (error, epics) {
        if (error) {
            callback(error);
        }
        if(epics != null) {
            async.eachSeries(epics.issues, function (epic, callback2) {
                    Module.findOne({ key: epic.key }, function (err, module) {
                        if (!module) {
                            module = new Module();
                        }
                        module.key = epic.key;
                        module.summary = epic.fields.summary;
                        module.save(function () {
                            epicsList.push(epic.key);
                            LogProgress(epic.key + " : " + epic.fields.summary + " Collected");
                            callback2();
                        })
                    });
                },
                function (err) {
                    if (err) {
                        LogProgress("!!!!!!!!!!!!!!!!!!!! Collect modules error happened!", err);
                    }
                    callback(err);
                });
        }
    });
}

function CollectPages(full, moduleKey, callback) {
    var queryString = full ?
        util.format("project = PLEXUXC AND issuetype = Story AND 'Epic Link' in (%s)", moduleKey) :
        util.format("project = PLEXUXC AND issuetype = Story AND 'Epic Link' in (%s) AND updated > -3d", moduleKey);

    var jira = new JiraApi(config.get("jiraAPIProtocol"), config.get("jiraUrl"), config.get("jiraPort"), _jiraUser, _jiraPass, '2');
    jira.searchJira(queryString, { fields: ["summary"] }, function (error, stories) {
        if (error) {
            callback(error);
        }
        if(stories != null) {
            async.eachSeries(stories.issues, function (story, callback2) {
                    issuesList.push(story.key);
                    epicIssueMap[story.key] = moduleKey;
                    LogProgress(story.key + " : " + story.fields.summary + " : Page Collected");
                    callback2();
                },
                function (err) {
                    if (err) {
                        LogProgress("!!!!!!!!!!!!!!!!!!!! Collect pages error happened!", err);
                    }
                    callback(err);
                });
        }
    });
}

function ProcessPage(storyKey, callback) {
    var jira = new JiraApi(config.get("jiraAPIProtocol"), config.get("jiraUrl"), config.get("jiraPort"), _jiraUser, _jiraPass, '2');
    jira.findIssue(storyKey + "?expand=changelog", function (error, issue) {
        if (error) {
            brokenPagesList.push(storyKey);
            LogProgress("!!!!!!!!!!!!!!!!!!!! " + storyKey + ' : Story was not found at JIRA!', error);
            callback(error);
        }
        if (issue == null || issue.key == null) {
            brokenPagesList.push(storyKey);
            LogProgress("!!!!!!!!!!!!!!!!!!!! " + storyKey + ' : Story was not found at JIRA!', error);
            callback(error);
        }
        else {
            SavePage(issue, function (error) {
                if(error) {
                    brokenPagesList.push(storyKey);
                    LogProgress("!!!!!!!!!!!!!!!!!!!! " + storyKey + ' : Story was not saved!', error);
                }
                callback(error);
            });
        }
    });
}

function SavePage(issue, callback) {
    Page.findOne({ key: issue.key }, function (err, page) {
        if (err) {
            LogProgress("!!!!!!!!!!!!!!!!!!!! " + page.key + ' : Error with Mongo db connection!', err);
            callback(err);
        }

        if (!page) {
            page = new Page();
        }
        page.key = issue.key;
        page.uri = "https://jira.epam.com/jira/browse/" + issue.key;
        page.summary = issue.fields.summary;
        page.status = issue.fields.status.name;
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
        async.eachSeries(issue.fields.subtasks, function(subtask, callback2) {
            var jira = new JiraApi(config.get("jiraAPIProtocol"), config.get("jiraUrl"), config.get("jiraPort"), _jiraUser, _jiraPass, '2');
            jira.findIssue(subtask.key + "?expand=changelog", function (error, subtask) {
                if (error) {
                    brokenPagesList.push(issue.key);
                    callback(error);
                }
                if (subtask != null) {
                    calcWorklogFromIssue(subtask, page);
                }
                callback2();
            });
        },
        function (err) {
            if (err) {
                LogProgress("!!!!!!!!!!!!!!!!!!!! " + page.key + ' : Error processing worklogs from subtasks!', err);
                callback(err);
            }
            page.save(function (err, page) {
                if (err) {
                    LogProgress("!!!!!!!!!!!!!!!!!!!! " + page.key + ' : Was not saved to Mongo db due to error!', err);
                    callback(err);
                }
                else {
                    callback();
                }
            })
        });
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









