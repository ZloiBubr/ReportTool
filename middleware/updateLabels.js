var util = require('util');
var config = require('../config');
var log = require('../libs/log')(module);
var _ = require('underscore');
var async = require('async');

var JiraApi = require('jira').JiraApi;
var response = null;
var updateInProgress = false;

exports.processItems = function (jqlQuery, jiraUser, jiraPassword, callback) {
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
                Step2UpdateIssues(jira, full, callback);
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

exports.rememberResponse = function (res) {
    response = res;
};

var writeToClient = function (text) {
    if(response != null) {
        response.write("event: logmessage\n");
        response.write('data: {"' + text + '}\n\n');
    }
};

function Step1CollectIssues(jira, jqlQuery, callback) {

}

function Step2UpdateIssues(jira, full, callback) {

}
