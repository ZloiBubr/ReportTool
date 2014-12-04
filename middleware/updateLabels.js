var config = require('../config');
var log = require('../libs/log')(module);
var _ = require('underscore');
var async = require('async');
var sessionsupport = require('../middleware/sessionsupport');

var JiraApi = require('jira').JiraApi;
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

exports.rememberResponse = function (req, res) {
    sessionsupport.setResponseObj('updateLabels', req, res);
};

var writeToClient = function (text, error) {
    if (error) {
        log.error(text);
        log.error(error);
        var errorText = error == null ? "not evaluated" : error.message == null ? error : error.message;
        sessionsupport.notifySubscribers('updateLabels', "errmessage", text + ", reason - " + errorText);
    }
    else {
        sessionsupport.notifySubscribers('updateLabels', "logmessage", text);
        log.info(text);
    }
};

function Step1CollectIssues(jira, params, callback) {
    issuesList = [];

    var loopError = 3;
    async.whilst(function() {
            return loopError-- > 0;
        },
        function(callback) {
            jira.searchJira(params.jqlQuery, { fields: ["summary", "labels", "assignee", "priority", "customfield_10002"] }, function (error, issues) {
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
    var addLabels = params.labelsToAdd != null && params.labelsToAdd != "";
    var deleteLabels = params.labelsToDelete != null  && params.labelsToDelete != "";
    var addWatcher = params.watchersToAdd != null  && params.watchersToAdd != "";
    var deleteWatcher = params.watchersToDelete != null  && params.watchersToDelete != "";
    var updateAssignee = params.assigneeName != null  && params.assigneeName != "";
    var updatePriority = params.priorityName != null  && params.priorityName != "";
    var addEpics = params.epicsToAdd != null  && params.epicsToAdd != "";
    var deleteEpics = params.epicsToDelete != null  && params.epicsToDelete != "";

    async.whilst(function() {
            return loopError-- > 0;
        },
        function(callback) {
            var issueUpdate = addLabels || deleteLabels ?
                {fields: {labels: issue.fields.labels ? issue.fields.labels : []}} :
                updateAssignee ?
                {fields: {assignee: { name: params.assigneeName}}} :
                updatePriority ?
                {fields: {priority: { name: params.priorityName}}} :
                addEpics || deleteEpics ?
                {fields: {customfield_10002: issue.fields.customfield_10002 ? issue.fields.customfield_10002 : []}} :
                {};
            if(addLabels) {
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
            }
            if(deleteLabels) {
                for(var j=0; j < issueUpdate.fields.labels.length; j++) {
                    if(params.labelsToDelete == issueUpdate.fields.labels[j]) {
                        issueUpdate.fields.labels.splice(j,1);
                        break;
                    }
                }
            }
            if(addEpics) {
                var exists = false;
                for(var j=0; j < issueUpdate.fields.customfield_10002.length; j++) {
                    if(params.epicsToAdd == issueUpdate.fields.customfield_10002[j]) {
                        exists = true;
                        break;
                    }
                }
                if(!exists) {
                    issueUpdate.fields.customfield_10002.push(params.epicsToAdd);
                }
            }
            if(deleteEpics) {
                for(var j=0; j < issueUpdate.fields.customfield_10002.length; j++) {
                    if(params.epicsToDelete == issueUpdate.fields.customfield_10002[j]) {
                        issueUpdate.fields.customfield_10002.splice(j,1);
                        break;
                    }
                }
            }
            if(addLabels || deleteLabels || updateAssignee || updatePriority || addEpics || deleteEpics) {
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
