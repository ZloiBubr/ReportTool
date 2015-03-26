/**
 * Created by Siarhei Hladkou (shladkou) on 2/26/14.
 */
var util = require('util');
var config = require('../config');
var log = require('../libs/log')(module);

var Module = require('../models/module').Module;
var Page = require('../models/page').Page;
var OriginalJiraIssue = require('../models/originalJiraIssue').Issue;
var Version = require('../models/Version').Version;
var Issue = require('../models/issue').Issue;
var CloudApp = require('../models/cloudApp').CloudApp;
var SizeChange = require('../models/sizeChange').SizeChange;

var _ = require('underscore');
var async = require('async');
var cache = require('node_cache');
var sessionsupport = require('../middleware/sessionsupport');
var helpers = require('../middleware/helpers');
var mongoose = require('./../libs/mongoose');
var Q = require('q');

var VERSION = require('../public/jsc/versions').VERSION;
var STATUS = require('../public/jsc/models/statusList').STATUS;

var JiraApi = require('jira').JiraApi;

var issueObjects = [];
var acceptanceObjectsMap = {};
var epicsMap = {};
var pagesMap = {};
var sizeChanges = [];

var updateInProgress = false;

var progressCounter = 0;
var lastProgress = 0;

var updateSpan = 0;

exports.rememberResponse = function (req, res) {
    sessionsupport.setResponseObj('updateDb', req, res);
    UpdateProgress(0, "page");
};

var UpdateProgress = function (progress, type) {
    sessionsupport.notifySubscribers('updateDb', "progress", '{"' + type + '":' + progress.toString() + "}");
    if (progress > 0) {
        LogProgress("**********" + type + " Progress " + progress.toString() + "% **********");
    }
};

var LogProgress = function (text, error) {
    if (error) {
        var errorText = error == null ? "not evaluated" : error.message == null ? error : error.message;
        sessionsupport.notifySubscribers('updateDb', "errmessage", text + ", reason - " + errorText);
        log.error(text);
        log.error(error);
    }
    else {
        sessionsupport.notifySubscribers('updateDb', "logmessage", text);
        log.info(text);
    }
};

exports.updateJiraInfo = function (debug, full, remove, jiraUser, jiraPassword, callback) {
    if (updateInProgress) {
        callback();
    }

    updateInProgress = true;
    progressCounter = 0;
    if(remove) {
        full = true;
    }

    var jira = debug ? null : new JiraApi(config.get("jiraAPIProtocol"), config.get("jiraUrl"), config.get("jiraPort"), jiraUser, jiraPassword, '2');

    async.series([
        function (callback) {
            if(!debug) {
                calcUpdateInterval(callback);
            }
            else {
                callback();
            }
        },
        function (callback) {
            if(!debug) {
                WriteVersion(true, callback);
            }
            else {
                callback();
            }
        },
        function (callback) {
            if(!debug) {
                LogProgress("**** Step 1: collect issue keys from JIRA");
                Step1CollectIssueKeys(jira, full, callback);
            }
            else {
                callback();
            }
        },
        function (callback) {
            if(!remove && !debug) {
                LogProgress("**** Step 2: collect issues from JIRA");
                Step2CollectIssues(jira, callback);
            }
            else {
                callback();
            }
        },
        function (callback) {
            if(remove && !debug) {
                LogProgress("**** Step 3: remove deleted issues from database");
                Step3DeleteIssues(callback);
            }
            else {
                callback();
            }
        },
        function (callback) {
            LogProgress("**** Step 4: drop collections from DB");
            Module.collection.drop(function (err) {
                if(err && err.errmsg != 'ns not found') {
                    callback(err);
                }
                LogProgress("1. Modules collection has been dropped");
                Page.collection.drop(function (err) {
                    if(err && err.errmsg != 'ns not found') {
                        callback(err);
                    }
                    LogProgress("2. Pages collection has been dropped");
                    Issue.collection.drop(function (err) {
                        if(err && err.errmsg != 'ns not found') {
                            callback(err);
                        }
                        LogProgress("3. Issues collection has been dropped");
                        CloudApp.collection.drop(function (err) {
                            if(err && err.errmsg != 'ns not found') {
                                callback(err);
                            }
                            LogProgress("4. CloudApps collection has been dropped");
                            SizeChange.collection.drop(function (err) {
                                if(err && err.errmsg != 'ns not found') {
                                    callback(err);
                                }
                                LogProgress("5. SizeChange collection has been dropped");
                                callback();
                            });
                        });
                    });
                });
            });
        },
        function (callback) {
            LogProgress("**** Step 5: collect modules");
            Step5CollectModules(callback);
        },
        function (callback) {
            LogProgress("**** Step 6: collect pages");
            Step6CollectStories(callback);
        },
        function (callback) {
            LogProgress("**** Step 7: collect acceptance tasks");
            Step7CollectAcceptanceTasks(callback);
        },
        function (callback) {
            LogProgress("**** Step 8: save story points changes");
            Step8CollectStoryPointsChanges(callback);
        },
        function (callback) {
            if(!debug) {
                WriteVersion(false, callback);
            }
            else {
                callback();
            }
        },
        function (callback) {
            LogProgress("---- Update Finished ----");
            cache.clearAllData();
            callback();
        }
    ],
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

function WriteVersion(started, callback) {
    Version.findOne({ numerical: VERSION.NUMBER }, function (err, version) {
        if (err) {
            callback(err);
        }

        if (!version) {
            version = new Version();
            version.numerical = VERSION.NUMBER;
            version.name = VERSION.NAME;
        }
        if(started) {
            version.started = new Date(Date.now());
        }
        else {
            version.updated = new Date(Date.now());
        }
        version.save(function (err, page) {
            callback(err, page);
        });
    });
}

function calcUpdateInterval(callback) {
    Version.findOne({ numerical: VERSION.NUMBER }, function (err, version) {
        if (err) {
            callback(err);
        }

        if (!version) {
            updateSpan = 0;
        }
        else {
            updateSpan = new Date(Date.now()) - version.started;
        }
        callback();
    });
}

function Step1CollectIssueKeys(jira, full, callback) {
    var startKey = 0;
    var loopCounter = true;

    var span = updateSpan > 0 ? parseInt(updateSpan / 1000 / 3600) : 24 * 3; // 3 days by default
    span = span > 0 ? span+1 : 2;
    var queryString = full ? "project = PLEX-UXC ORDER BY key ASC" : util.format("project = PLEX-UXC AND updated > -%sh ORDER BY key ASC", span);


    UpdateProgress(0, "page");

    issueObjects = [];

    async.series([
            function(callback) {
                async.whilst(function () {
                        return loopCounter;
                    },
                    function (callback) {

                        LogProgress("**** collecting issue keys: from " + startKey + " to " + (startKey + 1000).toString());

                        var optional = {};
                        optional.maxResults = 1000;
                        optional.startAt = startKey;
                        optional.fields = ["issuetype"];
                        startKey += 1000;

                        jira.searchJira(queryString, optional, function (error, stories) {
                            if (error) {
                                LogProgress("Collect issues error happened!", error);
                                callback(error);
                            }
                            if (stories != null) {
                                _.each(stories.issues, function (story) {
                                    issueObjects.push({key: story.key, issuetype: story.fields.issuetype.name});
                                });
                                if(stories.issues.length == 0 || stories.issues.length < 1000) {
                                    loopCounter = false;
                                }
                                callback();
                            }
                            else {
                                loopCounter = false;
                                callback();
                            }
                        });
                    },
                    function (err) {
                        callback(err);
                    }
                );
            }
        ],
        function(err) {
            callback(err);
        }
    );
}

function Step2CollectIssues(jira, callback) {
    LogProgress("**** Collecting " + issueObjects.length + " issues");
    lastProgress = 0;
    async.eachLimit(issueObjects, 50, function (issueObject, callback) {
            var loopError = true;
            async.whilst(function() {
                    return loopError;
                },
                function(callback) {
                    jira.findIssue(issueObject.key + "?expand=changelog,subtasks", function (err, issue) {
                        if (err) {
                            LogProgress("Restarting loop for key: "+issueObject.key, err);
                        }
                        if (issue != null) {
                            OriginalJiraIssue.findOne({ key: issue.key }, function (err, dbissue) {
                                if (!dbissue) {
                                    dbissue = new OriginalJiraIssue();
                                }
                                dbissue.key = issue.key;
                                dbissue.issuetype = issue.fields.issuetype.name;
                                dbissue.object = issue;

                                dbissue.save(function (err) {
                                    loopError = false;
                                    callback();
                                });
                            });
                        }
                        else {
                            loopError = false;
                            callback();
                        }
                    });
                },
                function(err) {
                    if(err) {
                        callback(err);
                    }
                    else {
                        LogProgress(++progressCounter + ":" + issueObject.key + " : Issue Collected");
                        var progress = Math.floor(progressCounter*100/issueObjects.length);
                        if(progress != lastProgress) {
                            lastProgress = progress;
                            UpdateProgress(progress, "page");
                        }
                        callback();
                    }
                }
            );
        },
        function (err) {
            callback(err);
        }
    );
}

function Step3DeleteIssues(callback) {
    var stream = OriginalJiraIssue.find().stream();

    stream.on('data', function (doc) {
        var found = false;
        for(var i=0; i < issueObjects.length; i++) {
            if(issueObjects[i].key == doc.key) {
                found = true;
                break;
            }
        }
        if(!found) {
            doc.remove();
        }
    }).on('error', function (err) {
        callback(err);
    }).on('close', function () {
        callback();
    });
}

function Step5CollectModules(callback) {
    var stream = OriginalJiraIssue.find({issuetype: 'Epic'}).stream();

    epicsMap = {};
    var count = 0;
    var count2 = 0;

    stream.on('data', function (doc) {
        stream.pause();
        var epic = doc.object;
        var module = epic.fields.summary.toLowerCase().indexOf('module') > -1;
        var automation = epic.fields.summary.toLowerCase().indexOf('automation') > -1;
        var vpScreens = epic.fields.summary.toLowerCase().indexOf('vp screens') > -1;
        count++;
        if(module && !automation && !vpScreens) {
            count2++;
            Module.findOne({ key: epic.key }, function (err, module) {
                if (!module) {
                    module = new Module();
                }
                module.key = epic.key;
                module.summary = epic.fields.summary;
                module.duedate = epic.fields.duedate == null ? null : new Date(epic.fields.duedate);
                module.devfinish = epic.fields.customfield_24500 == null ? null : new Date(epic.fields.customfield_24500);
                module.qafinish = epic.fields.customfield_24501 == null ? null : new Date(epic.fields.customfield_24501);
                module.accfinish = epic.fields.customfield_24502 == null ? null : new Date(epic.fields.customfield_24502);
                module.cusfinish = epic.fields.customfield_24503 == null ? null : new Date(epic.fields.customfield_24503);
                module.assignee = epic.fields.assignee == null ? "Unassigned" : epic.fields.assignee.name;
                module.status = epic.fields.status.name;
                module.resolution = epic.fields.resolution == null ? "" : epic.fields.resolution.name;
                module.labels = epic.fields.labels;
                module.fixVersions = epic.fields.fixVersions && epic.fields.fixVersions.length > 0 ? epic.fields.fixVersions[0].name : "";
                module.priority = epic.fields.priority.name;
                module.save(function (err, dbModule) {
                    epicsMap[module.key] = {key: module.key, dbid: dbModule._id};
                    if (err) {
                        callback(err);
                    }
                    stream.resume();
                });
            });
        }
        else {
            stream.resume();
        }
    }).on('error', function (err) {
        callback(err);
    }).on('close', function () {
        LogProgress(count + " Epics Total");
        LogProgress(count2 + " Modules Total");
        callback();
    });
}

function Step6CollectStories(callback) {
    var stream = OriginalJiraIssue.find({issuetype: 'Story'}).stream();

    pagesMap = {};
    var count = 0;
    var count2 = 0;
    acceptanceObjectsMap = {};
    sizeChanges = [];

    stream.on('data', function (doc) {
        stream.pause();
        var story = doc.object;
        var epic = story.fields.customfield_14500; //Epic link
        count++;

        if ((epic != undefined && epicsMap[epic]) || isAutomationStory(story)) {
            count2++;

            Q().then(function(){
                var deferred1 = Q.defer();
                Page.findOne({ key: story.key }, function (err, page) {
                    if (err) {
                        deferred1.reject();
                        return;
                    }

                    if (!page) {
                        page = new Page();
                    }

                    if(isAutomationStory(story)) {
                        page.automationType = true;
                    }
                    mapPageProperties(story, page);
                    parseHistory(story, page);
                    calcWorklogFromIssue(story, page);

                    Q().then(function(){return Q.all( mapSubtsks(story, page)) })
                       .then(function() {return Q.all(mapLinkedIssues(story, page)) })
                       .then(function () {
                            var deferred2 = Q.defer();
                            page.save(function (err, dbPage) {
                                pagesMap[page.key] = {key: page.key, dbid: dbPage._id};
                                LogProgress(page.key + " Page stored to database");
                                if (err) {
                                    deferred2.reject(err);
                                } else {
                                    deferred2.resolve();
                                }
                                //stream.resume();
                            });
                            return deferred2.promise;
                        })
                       .done(
                        function (err) { // success
                            deferred1.resolve();
                        },
                        function(err){ // error
                            deferred1.reject(err);
                        });
                });
                return deferred1.promise;

            })
            .catch(function(err){
                    console.error(err);
                })
            .finally(function(){ //finally run in any case
                    stream.resume();
                });
        }
        else {
            stream.resume();
        }
    }).on('error', function (err) {
        callback(err);
    }).on('close', function () {
        LogProgress(count + " Stories Total");
        LogProgress(count2 + " Pages Total");
        callback();
    });
}

// Step 6 methods

function mapPageProperties(story, page){
    page.key = story.key;
    page.uri = "https://jira.epam.com/jira/browse/" + story.key;
    page.summary = story.fields.summary;
    page.status = story.fields.status.name;
    page.resolution = story.fields.resolution == null ? "" : story.fields.resolution.name;
    page.reporter = story.fields.reporter.displayName;
    page.labels = story.fields.labels;
    if (story.fields.assignee != null)
        page.assignee = story.fields.assignee.displayName;
    page.storyPoints = story.fields.customfield_10004;
    page.blockers = story.fields.customfield_20501;
    page.progress = story.fields.customfield_20500;
    page.epicKey = story.fields.customfield_14500;
    page.created = story.fields.created;
    page.updated = story.fields.updated;
    page.testingProgress = story.fields.customfield_24700;
    page.checklistCreated = story.fields.customfield_24300 ? story.fields.customfield_24300[0].value == 'yes' : false;
}

function parseHistory(issue, page) {
    for (var i = 0; i < issue.changelog.total; i++) {
        var history = issue.changelog.histories[i];
        var author = history.author.displayName;
        for (var y = 0; y < history.items.length; y++) {
            var item = history.items[y];
            ParseProgress(item, page, author, history.created);
            ParseFinishDates(item, page, history.created);
            ParseSizeChanges(item, history, page);
        }
    }
}

function calcWorklogFromIssue(issue, page) {
    if (issue.fields.worklog) {
        for (var i = 0; i < issue.fields.worklog.worklogs.length; i++) {
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

function mapDates(page, subtaskObj) {
    page.devfinish = subtaskObj.fields.customfield_24500 ? new Date(subtaskObj.fields.customfield_24500) : null;
    page.qafinish = subtaskObj.fields.customfield_24501 ? new Date(subtaskObj.fields.customfield_24501) : null;
    page.accfinish = subtaskObj.fields.customfield_24502 ? new Date(subtaskObj.fields.customfield_24502) : null;
    page.cusfinish = subtaskObj.fields.customfield_24503 ? new Date(subtaskObj.fields.customfield_24503) : null;
    page.pmhfinish = subtaskObj.fields.customfield_25900 ? new Date(subtaskObj.fields.customfield_25900) : null;
    page.lafinish = subtaskObj.fields.customfield_25901 ? new Date(subtaskObj.fields.customfield_25901) : null;
    if (subtaskObj.fields.status.name == STATUS.CLOSED.name) {
        page.status = STATUS.PRODUCTION.name;
    }
    page.acceptanceStatus = subtaskObj.fields.status.name;
    page.acceptanceKey = subtaskObj.key;
    page.acceptanceAssignee = subtaskObj.fields.assignee ? subtaskObj.fields.assignee.name : "";
}

function mapSubtsks(story, page){
    if (_.isUndefined(story.fields.subtasks)) {
        return [];
    }

    var promises = [];

    _.each(story.fields.subtasks, function(subtaskItem){
        var subtaskKey = subtaskItem.key;

        var deferred = Q.defer();
        OriginalJiraIssue.findOne({key: subtaskKey}, function (err, subtask) {
            if (err) {
                deferred.reject(err);
                return;
            }

            if (subtask) {
                var subtaskObj = subtask._doc.object;
                if (subtaskObj.fields.summary.toLowerCase().indexOf('plex-acceptance') > -1) {
                    mapDates(page, subtaskObj);
                    acceptanceObjectsMap[subtaskObj.key] = {key: subtaskObj.key, parentPage: page.key, epicKey: page.epicKey};
                }
                calcWorklogFromIssue(subtaskObj, page);
            }

            deferred.resolve();
        });

        promises.push(deferred.promise);
    });

    return promises;
}

function mapLinkedIssues(jiraPage, dbPage) {

    var promises = [];
    _.each(jiraPage.fields.issuelinks, function (linkedIssueItem) {
        var linkedIssue = linkedIssueItem.inwardIssue ? linkedIssueItem.inwardIssue : linkedIssueItem.outwardIssue;
        if (linkedIssue.fields.issuetype.name != "Story") {
            var deffered = Q.defer();
            OriginalJiraIssue.findOne({key: linkedIssue.key},function (err, jiraLinkedIssue){
                if(err || !jiraLinkedIssue) {
                    deffered.reject(err);
                }
                if(jiraLinkedIssue) {
                    var jiraIssueItem = jiraLinkedIssue.object;
                    Issue.findOne({key: linkedIssue.key}, function (err, dbIssue) {
                        if (err) {
                            deffered.reject(err);
                        }

                        if (!dbIssue) {
                            dbIssue = new Issue();
                        }

                        dbIssue.key = jiraIssueItem.key;
                        dbIssue.uri = "https://jira.epam.com/jira/browse/" + jiraIssueItem.key;
                        dbIssue.type = jiraIssueItem.fields.issuetype.name;
                        dbIssue.summary = jiraIssueItem.fields.summary;
                        dbIssue.status = jiraIssueItem.fields.status.name;
                        dbIssue.resolution = jiraIssueItem.fields.resolution == null ? "" : jiraIssueItem.fields.resolution.name;
                        dbIssue.reporter = jiraIssueItem.fields.reporter.displayName;
                        //dbIssue.originalEstimate = jiraIssueItem.fields.timetracking.originalEstimate;
                        //dbIssue.timeSpent = jiraIssueItem.fields.timetracking.timeSpent;

                        dbIssue.created = jiraIssueItem.fields.created;
                        dbIssue.updated = jiraIssueItem.fields.updated;

                        dbIssue.labels = jiraIssueItem.fields.labels;
                        if (jiraIssueItem.fields.assignee != null)
                            dbIssue.assignee = jiraIssueItem.fields.assignee.displayName;

                        if (_.isUndefined(dbIssue.pages)) {
                            dbIssue.pages = [];
                        }
                        dbIssue.pages.push({linkType: linkedIssueItem.type.inward, page: dbPage._id});


                        dbIssue.save(function (err) {
                            if (err) {
                                deffered.reject(err);
                            }
                            else {

                                if (_.isUndefined(dbPage.issues)) {
                                    dbPage.issues = [];
                                }
                                dbPage.issues.push({inward: linkedIssueItem.type.outward, issue: dbIssue._id});

                                deffered.resolve(dbIssue);
                            }
                        });
                    });
                }

                promises.push(deffered.promise);
            });
        }
    });


//    if(dbPage != null) {
//        _.each(issue.fields.issuelinks, function (linkedIssueItem) {
//
//            var linkedIssue = linkedIssueItem.inwardIssue ? linkedIssueItem.inwardIssue : linkedIssueItem.outwardIssue;
//            if (linkedIssue.fields.issuetype.name != "Story") {
//                if (_.isUndefined(linkedIssueUniqList[linkedIssue.key])) {
//                    linkedIssueUniqList[linkedIssue.key] = {
//                        linkedIssueKey: linkedIssue.key,
//                        linkedPages: [
//                            {
//                                key: issue.key,
//                                _id: dbPage._id,
//                                linkType: linkedIssueItem.type.inward
//                            }
//                        ]
//                    };
//                } else {
//                    linkedIssueUniqList[linkedIssue.key].linkedPages.push({
//                        key: issue.key,
//                        _id: dbPage._id,
//                        linkType: linkedIssueItem.type.inward});
//                }
//            }
//        });
//    }


    return promises;
}

function isAutomationStory(story) {
    var labels = story.fields.labels;
    for(var i=0; i<labels.length; i++) {
        if(labels[i].toLowerCase().indexOf('automation') > -1 &&
            labels[i].toLowerCase().indexOf('automation_no') < 0 &&
            labels[i].toLowerCase().indexOf('automation_yes') < 0
        ) {
            if(story.fields.status != STATUS.OPEN.name) {
                return true;
            }
        }
    }

    var epic = story.fields.customfield_14500;
    return (epic == "PLEXUXC-37455");
}

// End Step 6 Methods
function Step7CollectAcceptanceTasks(callback) {
    var stream = OriginalJiraIssue.find({issuetype: 'Sub-task'}).stream();

    var count = 0;
    var count2 = 0;

    stream.on('data', function (doc) {
        stream.pause();
        var subTask = doc.object;
        count++;

        if (acceptanceObjectsMap[subTask.key]) {
            count2++;

            Q().then(function(){
                var deferred1 = Q.defer();
                CloudApp.findOne({ key: subTask.key }, function (err, cloudApp) {
                    if (err) {
                        deferred1.reject();
                        return;
                    }

                    if (!cloudApp) {
                        cloudApp = new CloudApp();
                    }

                    mapAcceptanceTask(cloudApp, subTask);
                    cloudApp.epicKey = acceptanceObjectsMap[subTask.key].epicKey;

                    Q().then(function(){
                        var deferred3 = Q.defer();
                        Page.findOne({key: acceptanceObjectsMap[subTask.key].parentPage}, function (err, page) {
                            if (err) {
                                deferred3.reject(err);
                            } else {
                                cloudApp._parentPage = page._id;
                                deferred3.resolve();
                            }
                        });
                        return deferred3.promise;
                    }).then(function() {
                        var deferred4 = Q.defer();
                        Module.findOne({key: acceptanceObjectsMap[subTask.key].epicKey}, function (err, epic) {
                            if (err) {
                                deferred4.reject(err);
                            } else if(epic) {
                                cloudApp._epic = epic._id;
                                deferred4.resolve();
                            }
                            else {
                                LogProgress("******************* Possible wrong epic name " + acceptanceObjectsMap[subTask.key].epicKey);
                                deferred4.resolve();
                            }
                        });
                        return deferred4.promise;
                    }).then(function () {
                            var deferred2 = Q.defer();
                            cloudApp.save(function (err, dbPage) {
                                LogProgress(cloudApp.key + " Acceptance Task stored to database");
                                if (err) {
                                    deferred2.reject(err);
                                } else {
                                    deferred2.resolve();
                                }
                            });
                            return deferred2.promise;
                        })
                        .done(
                        function () { // success
                            deferred1.resolve();
                        },
                        function(err){ // error
                            deferred1.reject(err);
                        });
                });
                return deferred1.promise;

            })
                .catch(function(err){
                    console.error(err);
                })
                .finally(function(){ //finally run in any case
                    stream.resume();
                });
        }
        else {
            stream.resume();
        }
    }).on('error', function (err) {
        callback(err);
    }).on('close', function () {
        LogProgress(count + " SubTasks Total");
        LogProgress(count2 + " CloudApps Total");
        callback();
    });
}

function mapAcceptanceTask(dbIssue, originalIssue) {
    dbIssue.key = originalIssue.key;
    dbIssue.uri = "https://jira.epam.com/jira/browse/" + originalIssue.key;
    dbIssue.type = originalIssue.fields.issuetype.name;
    dbIssue.summary = originalIssue.fields.summary;
    dbIssue.status = originalIssue.fields.status.name;
    dbIssue.resolution = originalIssue.fields.resolution == null ? "" : originalIssue.fields.resolution.name;
    dbIssue.reporter = originalIssue.fields.reporter.displayName;

    dbIssue.created = originalIssue.fields.created;
    dbIssue.updated = originalIssue.fields.updated;

    dbIssue.dev_complete = originalIssue.fields.customfield_24500;
    dbIssue.qa_complete = originalIssue.fields.customfield_24501;
    dbIssue.sme_complete = originalIssue.fields.customfield_24502;
    dbIssue.plex_complete = originalIssue.fields.customfield_24503;
    dbIssue.duedate = originalIssue.fields.duedate;

    dbIssue.labels = originalIssue.fields.labels;
    if (originalIssue.fields.assignee != null)
        dbIssue.assignee = originalIssue.fields.assignee.displayName;
}

function ParseSizeChanges(item, history, page) {
    if(page.automationType) {
        return;
    }
    var dateCreated = new Date(history.created);
    var dateMonthAgo = new Date(Date.now());
    dateMonthAgo.setMonth(dateMonthAgo.getMonth()-1);

    if(dateCreated < dateMonthAgo) {
        return;
    }
    if (item.fieldtype == 'custom' && (item.field == 'Story Points')) {
        var from = item.fromString == null ||
        item.fromString == undefined ||
        item.fromString == ''
            ?
            '0' : item.fromString;
        var to = item.toString;

        sizeChanges.push({date: dateCreated, key: page.key, summary: page.summary, person: history.author.displayName, from: from, to: to});
    }
}

function ParseProgress(item, page, author, created) {
    if (item.fieldtype == 'custom' && (item.field == 'Progress' || item.field == "Progress, %")) {
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

        if (to == STATUS.READYFORQA.name) {
            page.devFinished = created;
        }
        if (to == STATUS.RESOLVED.name) {
            page.qaFinished = created;
        }
    }
}

function Step8CollectStoryPointsChanges(callback) {
    async.each(sizeChanges, function(sizeChange, callback) {
        var sizeChangeDb = new SizeChange();
        sizeChangeDb.date = sizeChange.date;
        sizeChangeDb.key = sizeChange.key;
        sizeChangeDb.summary = sizeChange.summary;
        sizeChangeDb.from = sizeChange.from;
        sizeChangeDb.to = sizeChange.to;
        sizeChangeDb.person = sizeChange.person;
        sizeChangeDb.save(function (err) {
            LogProgress(sizeChangeDb.key + " Change stored to database");
            callback(err);
        });
    },
    function(err) {
        callback(err);
    });
}









