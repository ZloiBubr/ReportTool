/**
 * Created by Siarhei Hladkou (shladkou) on 2/26/14.
 */
var util = require('util');
var config = require('../config');
var log = require('../libs/log')(module);
var Module = require('../models/module').Module;
var Page = require('../models/page').Page;
var ClearDB = require('./createDb').Clear;

var JiraApi = require('jira').JiraApi;
var response = null;
var currentProgress = 0;

exports.rememberResponse = function(res) {
    response = res;
    currentProgress = 0;
    UpdateProgress(0);
}

var UpdateProgress = function(progress) {
    response.write("event: progress\n");
    response.write("data: " + progress.toString() + "\n\n");
    currentProgress = progress;
    if(progress == 100) {
        response.end();
    }
}

exports.updateJiraInfo = function (jiraUser, jiraPassword, callback) {
    ClearDB(function (err) {
        if (err) throw err;

        var jira = new JiraApi(config.get("jiraAPIProtocol"), config.get("jiraUrl"), config.get("jiraPort"), jiraUser, jiraPassword, '2');

        UpdateModules(jira, function () {
            log.info('**********************');
            log.info('Finished processing...');
            log.info('**********************');
        });
        callback();
    })
}

function UpdateModules(jira, callback) {
    jira.searchJira("project = PLEX-UXC AND issuetype = epic AND summary ~ Module AND NOT summary ~ automation ORDER BY key ASC", null, function (error, epics) {
        if (epics != null) {
            var numRunningQueries = 0;
            currentProgress = epics.issues.length;
            for (var i = 0; i < epics.issues.length; i++) {
                ++numRunningQueries;
                var epic = epics.issues[i];
                SaveModule(jira, epic, function () {
                    --numRunningQueries;
                    UpdateProgress(Math.floor((currentProgress - numRunningQueries)*100/currentProgress));
                    if (numRunningQueries === 0) {
                        UpdateProgress(100);
                        log.info('****** Finished Modules loop ******');
                        callback();
                    }
                });
            }
        }
        else {
            callback();
        }
    });
}

function SaveModule(jira, epic, callback) {
    Module.findOne({ key: epic.key }, function (err, module) {
        if (err) throw err;

        if (!module) {
            module = new Module();
        }
        module.key = epic.key;
        module.summary = epic.fields.summary;
        module.save(function (err, module) {
            if (err) throw err;
            UpdatePages(jira, epic.key, function () {
                log.info(module.key + ' : Module saved');
                callback();
            });
        })
    });
}

function UpdatePages(jira, moduleKey, callback) {
    jira.searchJira(util.format("project = PLEXUXC AND issuetype = Story AND 'Epic Link' in (%s)", moduleKey), null, function (error, stories) {
        if (stories != null) {
            var numRunningQueries = 0;
            for (var i = 0; i < stories.issues.length; i++) {
                ++numRunningQueries;
                var story = stories.issues[i];
                UpdatePage(jira, moduleKey, story.key.toString(), function () {
                    --numRunningQueries;
                    if (numRunningQueries === 0) {
                        log.info(moduleKey + ' : Finished Pages loop');
                        callback();
                    }
                });
            }
        }
        else {
            callback();
        }
    });
}

function UpdatePage(jira, moduleKey, storyKey, callback) {
    jira.findIssue(storyKey + "?expand=changelog", function (error, issue) {
        if (issue != null) {
            SavePage(jira, moduleKey, issue, function () {
                callback();
            });
        }
        else {
            callback();
        }
    });
}

function parseHistory(issue, page) {
    for (var i = 0; i < issue.changelog.total; i++) {
        var history = issue.changelog.histories[i];
        var author = history.author.displayName;
        for (var y = 0; y < history.items.length; y++) {
            if (history.items[y].fieldtype == 'custom' && history.items[y].field == 'Progress') {
                var from = history.items[y].fromString == null ||
                    history.items[y].fromString == undefined ||
                    history.items[y].fromString == ''
                    ?
                    '0' : history.items[y].fromString;
                var to = history.items[y].toString;

                if (page.progressHistory == null) {
                    page.progressHistory = [
                        {
                            person: author,
                            progressFrom: from,
                            progressTo: to,
                            dateChanged: history.created
                        }
                    ];
                }
                else {
                    page.progressHistory.push({
                        person: author,
                        progressFrom: from,
                        progressTo: to,
                        dateChanged: history.created
                    });
                }
            }
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
                        dateChanged: worklog.created
                    }
                ];
            }
            else {
                page.worklogHistory.push({
                    person: author,
                    timeSpent: timeSpent,
                    dateChanged: worklog.created
                });
            }
        }
    }
}

function parseWorklogs(jira, moduleKey, issue, page, callback) {
    var numRunningQueries = 0;
    calcWorklogFromIssue(issue, page);
    if (issue.fields.subtasks && issue.fields.subtasks.length > 0) {
        for (var i = 0; i < issue.fields.subtasks.length; i++) {
            var subtask = issue.fields.subtasks[i];
            ++numRunningQueries;
            jira.findIssue(subtask.key + "?expand=changelog", function (error, subtask) {
                if (error) throw error;
                if (subtask != null) {
                    calcWorklogFromIssue(subtask, page);
                }
                --numRunningQueries;
                if (numRunningQueries === 0) {
                    log.info(moduleKey + " : " + issue.key + ' : Finished Subtasks loop');
                    callback();
                }
            });
        }
    }
    else {
        callback();
    }
}

function SavePage(jira, moduleKey, issue, callback) {
    Page.findOne({ key: issue.key }, function (err, page) {
        if (err) throw err;

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
        page.epicKey = moduleKey;
        parseHistory(issue, page);
        parseWorklogs(jira, moduleKey, issue, page, function () {
            page.save(function (err, page) {
                if (err) throw err;
                log.info(moduleKey + " : " + page.key + ' : Page saved');
                callback();
            })
        });
    });
}







