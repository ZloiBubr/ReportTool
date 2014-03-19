/**
 * Created by Siarhei Hladkou (shladkou) on 2/26/14.
 */
var util = require('util');
var config = require('../config');
var log = require('../libs/log')(module);
var Module = require('../models/module').Module;
var Page = require('../models/page').Page;

JiraApi = require('jira').JiraApi;

exports.updateJiraInfo = function(jiraUser, jiraPassword, callback){
    var jira = new JiraApi(config.get("jiraAPIProtocol"), config.get("jiraUrl"), config.get("jiraPort"), jiraUser, jiraPassword, '2');

    UpdateModules(jira, function() {
        log.info('Finished processing...');
    });
    callback();
}

function UpdateModules(jira, callback) {
    jira.searchJira("project = PLEX-UXC AND issuetype = epic AND summary ~ Module AND NOT summary ~ automation ORDER BY key ASC", null, function (error, epics) {
        if (epics != null) {
            var numRunningQueries = 0;
            for (var i = 0; i < epics.issues.length; i++) {
                ++numRunningQueries;
                var epic = epics.issues[i];
                SaveModule(jira, epic, function() {
                    --numRunningQueries;
                    if(numRunningQueries === 0) {
                        log.info('Finished Modules loop');
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
    Module.findOne({ key: epic.key },function (err, module) {
        if (err) throw err;

        if (!module) {
            module = new Module();
        }
        module.key = epic.key;
        module.summary = epic.fields.summary;
        module.save(function (err, module) {
            if (err) throw err;
            log.info('Module saved : ' + module.key);
            UpdatePages(jira, epic.key, function() {
                callback();
            });
        })
    });
}

function UpdatePages(jira, moduleKey, callback) {
    jira.searchJira(util.format("project = PLEXUXC AND issuetype = Story AND 'Epic Link' in (%s)",moduleKey), null, function(error, stories) {
        if(stories != null){
            var numRunningQueries = 0;
            for(var i=0; i<stories.issues.length; i++) {
                ++numRunningQueries;
                var story = stories.issues[i];
                UpdatePage(jira, moduleKey, story.key.toString(), function() {
                    --numRunningQueries;
                    if(numRunningQueries === 0) {
                        log.info('Finished Pages loop');
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
    jira.findIssue(storyKey + "?expand=changelog", function(error, issue) {
        if (issue != null) {
            SavePage(moduleKey, issue, function() {
                callback();
            });
        }
        else {
            callback();
        }
    });
}

function SavePage(moduleKey, issue, callback) {
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
            page.assignee =  issue.fields.assignee.displayName;
        page.storyPoints = issue.fields.customfield_10004;
        page.blockers =  issue.fields.customfield_20501;
        page.progress =  issue.fields.customfield_20500;
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

                    if(page.progressHistory == null) {
                        page.progressHistory = [{
                            person: author,
                            progressFrom:from,
                            progressTo: to,
                            dateChanged: history.created
                        }];
                    }
                    else {
                        page.progressHistory.push({
                            person: author,
                            progressFrom:from,
                            progressTo: to,
                            dateChanged: history.created
                        });
                    }
                }
            }
        }

        page.save(function (err, page) {
            if (err) throw err;
            log.info('Page saved : Module : ' + moduleKey + ' : Page : ' + page.key);
            callback();
        })
    });
}







