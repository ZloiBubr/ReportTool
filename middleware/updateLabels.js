var util = require('util');
var config = require('../config');
var log = require('../libs/log')(module);
var _ = require('underscore');
var async = require('async');

var JiraApi = require('jira').JiraApi;
var response = null;
var updateInProgress = false;
var issuesList = [];

exports.processItems = function (jqlQuery, labelsToAdd, labelsToDelete, jiraUser, jiraPassword, callback) {
    if (updateInProgress) {
        callback();
    }

    updateInProgress = true;

    var jira = new JiraApi(config.get("jiraAPIProtocol"), config.get("jiraUrl"), config.get("jiraPort"), jiraUser, jiraPassword, '2');

    async.series([
            //step 1
            function (callback) {
                //grab all modules
                writeToClient("**** Step 1: collect issues");
                Step1CollectIssues(jira, jqlQuery, callback);
            },
            //step 2
            function (callback) {
                writeToClient("**** Step 2: update issues");
                //grab pages list
                Step2UpdateIssues(jira, labelsToAdd, labelsToDelete, callback);
            },
            //step 3
            function (callback) {
                updateInProgress = false;
                callback();
            }
        ],
        //optional callback
        function(err) {
            if(err) {
                writeToClient("**** Update Failed ****", err);
            }
            else {
                writeToClient("**** Update Succeed ****");
            }
        }
    );
    callback();
};

exports.rememberResponse = function (res) {
    response = res;
};

var writeToClient = function (text, error) {
    if(response && error == null) {
        response.write("event: logmessage\n");
        response.write('data: ' + text + '\n\n');
        log.info(text);
    }
    if (error) {
        log.error(text);
        log.error(error);
        if (response) {
            response.write("event: errmessage\n");
            var errorText = error == null ? "not evaluated" : error.message == null ? error : error.message;
            response.write("data: " + text + ", reason - " + errorText + "\n\n");
        }
    }
};

function Step1CollectIssues(jira, jqlQuery, callback) {
    issuesList = [];

    var loopError = true;
    async.whilst(function() {
            return loopError;
        },
        function(callback) {
            jira.searchJira(jqlQuery, { fields: ["summary", "labels"] }, function (error, issues) {
                if (error) {
                    callback(error);
                }
                if (issues != null) {
                    async.eachSeries(issues.issues, function (issue, callback) {
                            issuesList.push({key: issue.key, labels: issue.fields.labels});
                            writeToClient(issue.key + " : " + " Issue Collected");
                            callback();
                        },
                        function (err) {
                            if (err) {
                                writeToClient("Collect issues error happened!", err);
                            }
                            writeToClient(issuesList.length + " : " + " Issues Collected");
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
                writeToClient("Restarting Loop");
            }
            callback(err);
        });
}

function Step2UpdateIssues(jira, labelsToAdd, labelsToDelete, callback) {
    var addLabels = labelsToAdd.split(',');
    var delLabels = labelsToDelete.split(',');

    async.eachLimit(issuesList, 1, function (issueData, callback) {
            ProcessPageFromJira(jira, issueData, addLabels, delLabels, callback);
        },
        function (err) {
            callback();
        }
    );
}

function ProcessPageFromJira(jira, issueData, addLabels, delLabels, callback) {
    var loopError = true;
    async.whilst(function() {
            return loopError;
        },
        function(callback) {
            var issueUpdate = {fields: {labels: issueData.labels}};
            for(var i = 0; i < addLabels.length; i++) {
                var exists = false;
                for(var j=0; j < issueUpdate.fields.labels.length; j++) {
                    if(addLabels[i] == issueUpdate.fields.labels[j]) {
                        exists = true;
                        break;
                    }
                }
                if(!exists) {
                    issueUpdate.fields.labels.push(addLabels[i]);
                }
            }
            for(var i = 0; i < delLabels.length; i++) {
                for(var j=0; j < issueUpdate.fields.labels.length; j++) {
                    if(delLabels[i] == issueUpdate.fields.labels[j]) {
                        issueUpdate.fields.labels.splice(j,1);
                        break;
                    }
                }
            }
            jira.updateIssue(issueData.key, issueUpdate, function (error) {
                if (error) {
                    writeToClient("Update issue error happened!", error);
                    writeToClient("Restarting Loop for: "+issueData.key, error);
                }
                else {
                    loopError = false;
                }
                callback();
            });
        },
        function(err) {
            writeToClient(issueData.key + " : Issue Updated");
            callback();
        }
    );
}
