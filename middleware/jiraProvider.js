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

exports.rememberResponse = function(res) {
    response = res;
    UpdateProgress(0);
}

var UpdateProgress = function(progress) {
    response.write("event: progress\n");
    response.write("data: " + progress.toString() + "\n\n");
    if(progress > 0) {
        LogProgress("********** Progress ********** " + progress.toString());
    }
}

var LogProgress = function(text) {
    if(response) {
        response.write("event: logmessage\n");
        response.write("data: " + text + "\n\n");
    }
    log.info(text);
}

exports.updateJiraInfo = function (full, jiraUser, jiraPassword, callback) {
    ClearDB(full, function (err) {
        if (err) throw err;

        var jira = new JiraApi(config.get("jiraAPIProtocol"), config.get("jiraUrl"), config.get("jiraPort"), jiraUser, jiraPassword, '2');

        UpdateModules(full, jira, function (err) {
            if(err) {
                LogProgress('**************************');
                LogProgress('Error during processing...');
                LogProgress('Please restart Update!!!!!');
                LogProgress('**************************');
            }
            else {
                LogProgress('**********************');
                LogProgress('Finished processing...');
                LogProgress('**********************');
            }
            response.end();
        });
        callback();
    })
}

function UpdateModules(full, jira, callback) {
    var requestString = "project = PLEX-UXC AND issuetype = epic AND summary ~ Module AND NOT summary ~ automation ORDER BY key ASC";

    UpdateProgress(2);
    jira.searchJira(requestString, null, function (error, epics) {
        if (epics != null) {
            var numRunningQueries = 0;
            var totalModules = epics.issues.length;
            for (var i = 0; i < totalModules; i++) {
                ++numRunningQueries;
                var epic = epics.issues[i];
                LogProgress("********** Module #" + numRunningQueries.toString() + " of " + totalModules + " : " + epic.key);
                SaveModule(full, jira, epic, function (err) {
                    if(err) {
                        callback(err);
                    }
                    LogProgress("********** Module #" + numRunningQueries.toString() + " of " + totalModules + " finished processing");
                    --numRunningQueries;
                    var progress = Math.floor((totalModules - numRunningQueries)*100/totalModules);
                    UpdateProgress(progress);
                    if (numRunningQueries === 0) {
                        LogProgress('****** Finished Modules loop ******');
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

function SaveModule(full, jira, epic, callback) {
    Module.findOne({ key: epic.key }, function (err, module) {
        if (err) throw err;

        if (!module) {
            module = new Module();
        }
        module.key = epic.key;
        module.summary = epic.fields.summary;
        module.save(function (err, module) {
            if (err) throw err;
            UpdatePages(full, jira, epic.key, function (err) {
                if(err) {
                    callback(err);
                }
                LogProgress(module.key + ' : Module saved');
                callback();
            });
        })
    });
}

function UpdatePages(full, jira, moduleKey, callback) {
    var queryString = full ?
        util.format("project = PLEXUXC AND issuetype = Story AND 'Epic Link' in (%s)", moduleKey) :
        util.format("project = PLEXUXC AND issuetype = Story AND 'Epic Link' in (%s) AND updated > -7d", moduleKey);
    jira.searchJira(queryString, null, function (error, stories) {
        if (stories != null) {
            var numRunningQueries = 0;
            for (var i = 0; i < stories.issues.length; i++) {
                ++numRunningQueries;
                var story = stories.issues[i];
                UpdatePage(jira, moduleKey, story.key.toString(), function (err, storykey) {
                    if(err) {
                        callback(err);
                    }
                    LogProgress(moduleKey + ' : ' + storykey + ' Page updated');
                    --numRunningQueries;
                    if (numRunningQueries === 0) {
                        callback();
                    }
                });
            }
            if(stories.issues.length == 0) {
                callback();
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
            SavePage(jira, moduleKey, issue, function (err) {
                callback(err, storyKey);
            });
        }
        else {
            callback(storyKey);
        }
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
                    dateChanged: created
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
                    record.dateChanged == created) {
                    recordFound = true;
                    break;
                }
            }
            if (!recordFound) {
                page.progressHistory.push({
                    person: author,
                    progressFrom: from,
                    progressTo: to,
                    dateChanged: created
                });
            }
        }
    }
}

function ParseFinishDates(item, page, created) {
    if (item.fieldtype == 'jira' && item.field == 'status') {
        var from = item.fromString;
        var to = item.toString;

        if(from == "In Progress" && to =="Ready for QA") {
            page.devFinished = created;
        }
        if(from == "Testing in Progress" && to =="Resolved") {
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
                        dateChanged: worklog.created,
                        dateStarted: worklog.started
                    }
                ];
            }
            else {
                //look if already exists
                var recordFound = false;
                for(var o = 0; o<page.worklogHistory.length; o++) {
                    var record = page.worklogHistory[o];
                    if( record.person == author &&
                        record.timeSpent == timeSpent &&
                        record.dateChanged == worklog.created &&
                        record.dateStarted == worklog.started) {
                        recordFound = true;
                        break;
                    }
                }
                if(!recordFound) {
                    page.worklogHistory.push({
                        person: author,
                        timeSpent: timeSpent,
                        dateChanged: worklog.created,
                        dateStarted: worklog.started
                    });
                }
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
                    //LogProgress(moduleKey + " : " + issue.key + ' : Finished Subtasks loop');
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
        if (err) {
            LogProgress(moduleKey + " : " + page.key + ' : Error from JIRA, please restart Update');
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
        page.epicKey = moduleKey
        page.created = issue.fields.created;
        page.updated = issue.fields.updated;
        parseHistory(issue, page);
        parseWorklogs(jira, moduleKey, issue, page, function () {
            page.save(function (err, page) {
                //if (err) throw err;
                //LogProgress(moduleKey + " : " + page.key + ' : Page saved');
                callback(err);
            })
        });
    });
}







