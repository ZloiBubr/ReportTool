var util = require('util');
var config = require('../config');
var log = require('../libs/log')(module);
var _ = require('underscore');
var async = require('async');

var JiraApi = require('jira').JiraApi;
var response = null;
var updateInProgress = false;

exports.processItems = function (params, callback) {
    if (updateInProgress) {
        callback();
    }

    updateInProgress = true;

    var jira = new JiraApi(config.get("jiraAPIProtocol"), config.get("jiraUrl"), config.get("jiraPort"), params.username, params.password, '2');

    async.series([
            //step 1
            function (callback) {
                //grab all modules
                writeToClient("**** Starting Update");
                Step1CollectIssues(jira, params, callback);
            },
            //step 2
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

function Step1CollectIssues(jira, params, callback) {
    issuesList = [];

    var loopError = 3;
    async.whilst(function() {
            return loopError-- > 0;
        },
        function(callback) {
            jira.searchJira(params.jqlQuery, { fields: ["summary", "labels", "assignee", "priority"] }, function (error, issues) {
                if (error) {
                    callback(error);
                }
                if (issues != null) {
                    async.eachSeries(issues.issues, function (issue, callback) {
                            ProcessPageFromJira(jira, params, issue, callback);
                        },
                        function (err) {
                            if(err == null) {
                                loopError = 0;
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

function ProcessPageFromJira(jira, params, issue, callback) {
    var loopError = 3;
    var updateLabels = params.labelsToAdd || params.labelsToDelete;
    var addWatcher = params.watchersToAdd;
    var deleteWatcher = params.watchersToDelete;
    var updateAssignee = params.assigneeName;
    var updatePriority = params.priorityName;

    async.whilst(function() {
            return loopError-- > 0;
        },
        function(callback) {
            var issueUpdate = updateLabels ?
                {fields: {labels: issue.fields.labels}} :
                updateAssignee ?
                {fields: {assignee: { name: params.assigneeName}}} :
                updatePriority ?
                {fields: {priority: { name: params.priorityName}}} : {};
            if(updateLabels) {
                var exists = false;
                for(var j=0; j < issueUpdate.fields.labels.length; j++) {
                    if(params.labelsToAdd == issueUpdate.fields.labels[j]) {
                        exists = true;
                        break;
                    }
                }
                if(!exists) {
                    issueUpdate.fields.labels.push(params.labelsToAdd);
                }
                for(var j=0; j < issueUpdate.fields.labels.length; j++) {
                    if(params.labelsToDelete == issueUpdate.fields.labels[j]) {
                        issueUpdate.fields.labels.splice(j,1);
                        break;
                    }
                }
            }
            if(updateLabels || updateAssignee || updatePriority) {
                jira.updateIssue(issue.key, issueUpdate, function (error) {
                    if (error) {
                        writeToClient("Update issue error happened!", error);
                        writeToClient("Restarting Loop for: "+labelsData.key, error);
                    }
                    else {
                        loopError = 0;
                    }
                    callback();
                });
            }
            if(addWatcher) {
                jira.addWatcher(issue.key, params.watchersToAdd, function (error) {
                    if (error) {
                        writeToClient("Add watchers error happened!", error);
                        writeToClient("Restarting Loop for: " + issue.key, error);
                    }
                    else {
                        loopError = 0;
                    }
                    callback();
                });
            }
            if(deleteWatcher) {
                jira.deleteWatcher(issue.key, params.watchersToDelete, function (error) {
                    if (error) {
                        writeToClient("Delete watchers error happened!", error);
                        writeToClient("Restarting Loop for: " + issue.key, error);
                    }
                    else {
                        loopError = 0;
                    }
                    callback();
                });
            }
        },
        function(err) {
            writeToClient(issue.key + " : Issue Updated");
            callback();
        }
    );
}
