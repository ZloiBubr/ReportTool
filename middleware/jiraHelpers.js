var async = require('async');

var Module = require('../models/module').Module;
var Page = require('../models/page').Page;
var OriginalJiraIssue = require('../models/originalJiraIssue').Issue;
var Version = require('../models/Version').Version;
var Issue = require('../models/issue').Issue;
var CloudApp = require('../models/cloudApp').CloudApp;
var SizeChange = require('../models/sizeChange').SizeChange;

var VERSION = require('../public/jsc/versions').VERSION;

exports.getFullJiraIssue = function(jira, issueKey, jiraIssue, LogProgress, callback) {
    var counter = 3;
    async.whilst(
        function() {
            return counter-- > 0;
        },
        function(callback) {
            jira.findIssue(issueKey + "?expand=changelog,subtasks", function (err, issue) {
                if (err) {
                    LogProgress("Issue retrieve error for key: " + issueKey, err);
                    callback();
                } else {
                    jiraIssue.issue = issue;
                    counter = 0;
                    callback();
                }
            });
        },
        function(err) {
            callback(err);
        }
    );
};

exports.updateWorklogForJiraIssue = function(jira, jiraIssue, LogProgress, callback) {
    if (jiraIssue.issue && jiraIssue.issue.fields.worklog && jiraIssue.issue.fields.worklog.total > 20) {
        var counter = 3;
        async.whilst(
            function() {
                return counter-- > 0;
            },
            function(callback) {
                jira.findIssue(jiraIssue.issue.key + "/worklog", function (err, issue) {
                    if (err) {
                        LogProgress("Work log retrieve error for key: " + jiraIssue.issue.key, err);
                        callback();
                    } else {
                        jiraIssue.issue.fields.worklog = issue.worklog;
                        counter = 0;
                        callback();
                    }
                });
            },
            function(err) {
                callback(err);
            }
        );
    }
    else {
        callback();
    }
};

exports.saveJiraIssueToDB = function(jiraIssue, callback) {
    OriginalJiraIssue.findOne({key: jiraIssue.issue.key}, function (err, dbissue) {
        if (!dbissue) {
            dbissue = new OriginalJiraIssue();
        }
        dbissue.key = jiraIssue.issue.key;
        dbissue.issuetype = jiraIssue.issue.fields.issuetype.name;
        dbissue.object = jiraIssue.issue;

        dbissue.save(function (err) {
            callback();
        });
    });
};

exports.calcUpdateInterval = function(debug, callback) {
    if(debug) {
        callback();
    }
    else {
        Version.findOne({ numerical: VERSION.NUMBER }, function (err, version) {
            if (err) {
                callback(0, err);
            }

            if (!version) {
                callback(0);
            }
            else {
                callback(new Date(Date.now()) - version.updated);
            }
        });
    }
};

exports.WriteVersion = function(start, debug, callback) {
    Version.findOne({ numerical: VERSION.NUMBER }, function (err, version) {
        if (err) {
            callback(err);
        }

        if (!version) {
            version = new Version();
            version.numerical = VERSION.NUMBER;
            version.name = VERSION.NAME;
        }
        if(start) {
            version.started = new Date(Date.now());
        }
        else {
            version.updated = version.started;
        }
        version.save(function (err) {
            callback(err);
        });
    });
};


exports.collectionDrop = function(collectionType, LogProgress, callback) {
    collectionType.collection.drop(function (err) {
        if(err && err.errmsg != 'ns not found') {
            callback(err);
        }
        else {
            LogProgress("Collection has been dropped from DB");
            callback();
        }
    });
};
