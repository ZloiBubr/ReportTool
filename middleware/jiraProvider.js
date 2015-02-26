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
var _ = require('underscore');
var async = require('async');
var cache = require('node_cache');
var sessionsupport = require('../middleware/sessionsupport');
var helpers = require('../middleware/helpers');
var mongoose = require('./../libs/mongoose');

var VERSION = require('../public/jsc/versions').VERSION;
var STATUS = require('../public/jsc/models/statusList').STATUS;

var JiraApi = require('jira').JiraApi;

var issueObjects = [];
var epicsMap = {};
var pagesMap = {};

var issuesList = [];
var acceptanceTasks = {};
var linkedIssueUniqList = [];
var pagesProgressCount = 0;
var updateInProgress = false;

var progressCounter = 0;
var lastProgress = 0;

exports.rememberResponse = function (req, res) {
    sessionsupport.setResponseObj('updateDb', req, res);
    UpdateProgress(0, "page");
    UpdateProgress(0, "issues");
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
                            callback();
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
            /*
        //step 2-2
        function (callback) {
            LogProgress("**** Step 2-2: collect automation stories");
            //grab automation pages list
            Step2CollectAutomationStories(jira, full, callback);
        },
        //step 3
        function (callback) {
            //process pages
            LogProgress("**** Step 3: process " + issuesList.length + " pages");
            Step3ProcessPages(jira, callback);
        },
        //step 5
        function (callback) {
            // process linked issues pages
            LogProgress("**** Step 4: process acceptance tasks");
            Step4ProcessCloudApps(jira, callback);
        },
        //step 5
        function (callback) {
            // process linked issues pages
            LogProgress("**** Step 5: process blockers");
            Step5ProcessBlockers(jira, callback);
        },

        //step 6
        function (callback) {
//            LogProgress("**** Step 5: Update End");
//            response.end();
            updateInProgress = false;
            callback();
        },
             */
        function (callback) {
            WriteVersion(callback);
        },
        function (callback) {
            LogProgress("**** Update Finished ****");
            cache.clearAllData();
            callback();
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

function WriteVersion(callback) {
    Version.findOne({ numerical: VERSION.NUMBER }, function (err, version) {
        if (err) {
            callback(err);
        }

        if (!version) {
            version = new Version();
            version.numerical = VERSION.NUMBER;
            version.name = VERSION.NAME;
        }
        version.updated = new Date(Date.now());
        version.save(function (err, page) {
            callback(err, page);
        });
    });
}

function Step1CollectIssueKeys(jira, full, callback) {
    var startKey = 0;
    var loopCounter = true;

    UpdateProgress(0, "page");
    UpdateProgress(0, "issues");

    issueObjects = [];

    async.series([
            function(callback) {
                async.whilst(function () {
                        return loopCounter;
                    },
                    function (callback) {
                        var queryString = full ? "project = PLEX-UXC ORDER BY key ASC" : "project = PLEX-UXC AND updated > -1d ORDER BY key ASC";

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
                                if(stories.issues.length == 0) {
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
                    jira.findIssue(issueObject.key + "?expand=changelog,subtasks", function (error, issue) {
                        if (error) {
                            LogProgress("Restarting loop for key: "+issueObject.key, error);
                        }
                        else {
                            if (issue != null) {
                                OriginalJiraIssue.findOne({ key: issue.key }, function (err, dbissue) {
                                    if (err) {
                                        callback(err);
                                    }

                                    if (!dbissue) {
                                        dbissue = new OriginalJiraIssue();
                                    }
                                    dbissue.key = issue.key;
                                    dbissue.issuetype = issue.fields.issuetype.name;
                                    dbissue.object = issue;

                                    dbissue.save(function (err) {
                                        loopError = false;
                                        callback(err);
                                    });
                                });
                            }
                            else {
                                loopError = false;
                                callback();
                            }
                        }
                    });
                },
                function(err) {
                    LogProgress(++progressCounter + ":" + issueObject.key + " : Issue Collected");
                    var progress = Math.floor(progressCounter*100/issueObjects.length);
                    if(progress != lastProgress) {
                        lastProgress = progress;
                        UpdateProgress(progress, "page");
                    }
                    callback(err);
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
    var modulesCollection = [];

    stream.on('data', function (doc) {
        var epic = doc.object;
        var module = epic.fields.summary.toLowerCase().indexOf('module') > -1;
        var automation = epic.fields.summary.toLowerCase().indexOf('automation') > -1;
        var vpScreens = epic.fields.summary.toLowerCase().indexOf('vp screens') > -1;
        count++;
        if(module && !automation && !vpScreens) {
            count2++;
            var module = new Module();
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
            modulesCollection.push(module);
        }
    }).on('error', function (err) {
        callback(err);
    }).on('close', function () {
        LogProgress(count + " Epics Total");
        LogProgress(count2 + " Modules Total");
        async.eachSeries(modulesCollection, function(module, callback) {
            module.save(function (err) {
                epicsMap[module.key] = module.key;
                if(err) {
                    callback(err);
                }
                else {
                    callback();
                }
            })
        },
        function(err) {
            LogProgress(Object.keys(epicsMap).length + " Modules Collected");
            UpdateProgress(10, "issues");
            callback(err);
        });
    });
}

function isAutomationStory(story) {
    var labels = story.fields.labels;
    for(var i=0; i<labels.length; i++) {
        if(labels[i].toLowerCase().indexOf('automation') > -1) {
            if(story.fields.status != STATUS.OPEN.name)
                return true;
        }
    }
    var epic = story.fields.customfield_14500;
    OriginalJiraIssue.findOne({ key: epic }, function (err, epic) {
        if(err) {
            return false;
        }
        if(epic.summary.toLowerCase().indexOf('automation test data fixing') > -1) {
            return true;
        }
    });
}

function Step6CollectStories(callback) {
    var stream = OriginalJiraIssue.find({issuetype: 'Story'}).stream();

    pagesMap = {};
    var count = 0;
    var count2 = 0;
    var pagesCollection = [];

    stream.on('data', function (doc) {
        var story = doc.object;
        var epic = story.fields.customfield_14500; //Epic link
        count++;

        if(epic != undefined && epicsMap[epic]) {
            count2++;
            var page = new Page();
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
            page.epicKey = epic;
            page.created = story.fields.created;
            page.updated = story.fields.updated;
            page.testingProgress = story.fields.customfield_24700;
            page.checklistCreated = story.fields.customfield_24300 ? story.fields.customfield_24300[0].value == 'yes' : false;
            parseHistory(story, page);
            calcWorklogFromIssue(story, page);
            if (story.fields.subtasks) {
                for (var i = 0; i < story.fields.subtasks.length; i++) {
                    var subtaskKey = story.fields.subtasks[i].key;
                    OriginalJiraIssue.findOne({key: subtaskKey}).exec(function (err, subtask) {
                        if (err) {
                            callback(err);
                        }

                        if (subtask) {
                            var subtaskObj = subtask._doc.object;
                            if (subtaskObj.fields.summary.toLowerCase().indexOf('PLEX-Acceptance') > -1) {
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
                            calcWorklogFromIssue(subtaskObj, page);
                        }
                        page.save(function (err) {
                            pagesMap[page.key] = page.key;
                            if(err) {
                                callback(err);
                            }
                        })
                    });
                }
            }
            else {
                page.save(function (err) {
                    pagesMap[page.key] = page.key;
                    if(err) {
                        callback(err);
                    }
                })
            }
        }
    }).on('error', function (err) {
        callback(err);
    }).on('close', function () {
        LogProgress(count + " Stories Total");
        LogProgress(count2 + " Pages Total");
        LogProgress(Object.keys(pagesMap).length + " Pages Collected");
        UpdateProgress(50, "issues");
        callback();
    });
}

function Step2CollectAutomationStories(jira, full, callback) {
    var queryString = "project = PLEXUXC AND issuetype = Story AND ((labels in (Automation) AND status not in (Open)) OR ('Epic Link' = 'Automation test data fixing'))";

    if(!full) {
        queryString += " AND updated > -3d";
    }

    var loopError = true;
    async.whilst(function() {
            return loopError;
        },
        function(callback) {
            LogProgress("**** collect automation stories");
            jira.searchJira(queryString, { fields: ["summary"] }, function (error, stories) {
                if (error) {
                    LogProgress("Collect automation stories error happened!", error);
                    LogProgress("Restarting Loop", error);
                    callback();
                }
                if (stories != null) {
                    async.eachSeries(stories.issues, function (story, callback) {
                            pagesProgressCount++;
                            issuesList.push(story.key);
                            //epicIssueMap[story.key] = moduleKey;
                            callback();
                        },
                        function (err) {
                            if (err) {
                                LogProgress("Restarting Loop for: "+story.key, err);
                            }
                            else {
                                loopError = false;
                            }
                            callback();
                        }
                    );
                }
                else {
                    loopError = false;
                    callback();
                }
            });
        },
        function(err) {
            LogProgress("Automation Stories Collected");
            callback();
        }
    );
}


function Step4ProcessCloudApps(jira, callback) {
    async.eachLimit(Object.keys(acceptanceTasks), 10, function (acceptanceTaskKey, callback) {
            var currentProgress = Math.floor((++progressCounter * 100) / pagesProgressCount);
            var acceptanceTask = acceptanceTasks[acceptanceTaskKey];
            if (lastProgress != currentProgress) {
                lastProgress = currentProgress;
                UpdateProgress(currentProgress, "page");
            }

            ProcessAcceptanceTasksFromJira(jira, acceptanceTask, progressCounter, callback)
        },
        function (err) {
            callback();
        }
    );
}

function Step5ProcessBlockers(jira, callback) {
    var counter = 0;
    var lastProgress = 0;
    var keys = Object.keys(linkedIssueUniqList);
    async.eachLimit(keys, 10, function (linkedIssueKey, callback) {
            var currentProgress = Math.floor((++counter * 100) / keys.length);
            if (lastProgress != currentProgress) {
                lastProgress = currentProgress;
                UpdateProgress(currentProgress, "issues");
            }
            var linkedIssue = linkedIssueUniqList[linkedIssueKey];
            ProcessBlockersFromJira(jira, linkedIssue, counter, callback);
        },
        function (err) {
            callback();
        }
    );
}

function ProcessPageFromJira(jira, issueKey, counter, callback) {
    var loopError = true;
    async.whilst(function() {
            return loopError;
        },
        function(callback) {
            jira.findIssue(issueKey + "?expand=changelog", function (error, issue) {
                if (error) {
                    LogProgress("Collect pages error happened!", error);
                    LogProgress("Restarting Loop for: "+issueKey, error);
                    callback();
                }
                else if (issue != null) {
                    SavePage(jira, issue, function (error, dbPage) {
                        if (error) {
                            LogProgress("Restarting Loop for:"+issueKey, error);
                            callback();
                        }else {
                            MapLinkedIssues(issue, dbPage);
                            MapAcceptanceTasks(issue, dbPage);
                            loopError = false;
                            callback();
                        }
                    });
                }
                else {
                    loopError = false;
                    callback();
                }
            });
        },
        function(err) {
            LogProgress(counter + ":" + issueKey + " : Page Collected");
            callback();
        }
    );
}

function ProcessAcceptanceTasksFromJira(jira, acceptanceTasks, counter, callback) {
    var loopError = true;
    async.whilst(function() {
            return loopError;
        },
        function(callback) {
            jira.findIssue(acceptanceTasks.id, function (error, jiraAcceptanceTask) {
                if (error) {
                    LogProgress("Collect acceptance tasks error happened!", error);
                    LogProgress("Restarting Loop for:"+jiraAcceptanceTask.key, error);
                    callback();
                }
                else if(jiraAcceptanceTask != null) {
                    loopError = false;
                    SaveAcceptanceTask(jiraAcceptanceTask, acceptanceTasks, callback);
                }
                else {
                    loopError = false;
                    callback();
                }
            });
        },
        function(err) {
            LogProgress(counter + ":" + acceptanceTasks.key + " : Acceptance Task Collected");
            callback();
        }
    );
}



function MapLinkedIssues(issue, dbPage) {
    if(dbPage != null) {
        _.each(issue.fields.issuelinks, function (linkedIssueItem) {
            var linkedIssue = linkedIssueItem.inwardIssue ? linkedIssueItem.inwardIssue : linkedIssueItem.outwardIssue;
            if (linkedIssue.fields.issuetype.name != "Story") {
                if (_.isUndefined(linkedIssueUniqList[linkedIssue.key])) {
                    linkedIssueUniqList[linkedIssue.key] = {
                        linkedIssueKey: linkedIssue.key,
                        linkedPages: [
                            {
                                key: issue.key,
                                _id: dbPage._id,
                                linkType: linkedIssueItem.type.inward
                            }
                        ]
                    };
                } else {
                    linkedIssueUniqList[linkedIssue.key].linkedPages.push({
                        key: issue.key,
                        _id: dbPage._id,
                        linkType: linkedIssueItem.type.inward});
                }
            }
        });
    }
}

function MapAcceptanceTasks(issue, dbPage) {
    var acceptanceTask = acceptanceTasks[issue.key];
    if(acceptanceTask) {
        acceptanceTask.epicKey = dbPage.epicKey;
        acceptanceTask.parentPageId = dbPage._id;
        acceptanceTask.epicId = epicsMap[dbPage.epicKey].id;
    }
}

function ProcessBlockersFromJira(jira, linkedIssue, counter, callback) {
    var loopError = true;
    async.whilst(function() {
            return loopError;
        },
        function(callback) {
            jira.findIssue(linkedIssue.linkedIssueKey, function (error, jiraLinkedIssue) {
                if (error) {
                    LogProgress("Collect issues error happened!", error);
                    LogProgress("Restarting Loop for:"+linkedIssue.linkedIssueKey, error);
                    callback();
                }
                else if(jiraLinkedIssue != null) {
                    loopError = false;
                    SaveLinkedIssue(jiraLinkedIssue, callback);
                }
                else {
                    loopError = false;
                    callback();
                }
            });
        },
        function(err) {
            LogProgress(counter + ":" + linkedIssue.linkedIssueKey + " : Issue Collected");
            callback(err);
        }
    );
}
function SaveAcceptanceTask(jiraAcceptanceTask, mapAcceptanceTask, callback) {
        CloudApp.findOne({key: mapAcceptanceTask.key}, function (err, dbIssue) {
        if (err) {
            callback(err);
        }

        if (!dbIssue) {
            dbIssue = new CloudApp();
        }

        dbIssue.key = jiraAcceptanceTask.key;
        dbIssue.uri = "https://jira.epam.com/jira/browse/" + jiraAcceptanceTask.key;
        dbIssue.type = jiraAcceptanceTask.fields.issuetype.name;
        dbIssue.summary = jiraAcceptanceTask.fields.summary;
        dbIssue.status = jiraAcceptanceTask.fields.status.name;
        dbIssue.resolution = jiraAcceptanceTask.fields.resolution == null ? "" : jiraAcceptanceTask.fields.resolution.name;
        dbIssue.reporter = jiraAcceptanceTask.fields.reporter.displayName;

        dbIssue.created = jiraAcceptanceTask.fields.created;
        dbIssue.updated = jiraAcceptanceTask.fields.updated;

        dbIssue.dev_complete = jiraAcceptanceTask.fields.customfield_24500;
        dbIssue.qa_complete= jiraAcceptanceTask.fields.customfield_24501;
        dbIssue.sme_complete = jiraAcceptanceTask.fields.customfield_24502;
        dbIssue.plex_complete = jiraAcceptanceTask.fields.customfield_24503;
        dbIssue.duedate = jiraAcceptanceTask.fields.duedate;

        dbIssue.labels = jiraAcceptanceTask.fields.labels;
        if (jiraAcceptanceTask.fields.assignee != null)
            dbIssue.assignee = jiraAcceptanceTask.fields.assignee.displayName;

        dbIssue.epicKey = mapAcceptanceTask.epicKey;
        dbIssue._parentPage = mapAcceptanceTask.parentPageId;
        dbIssue._epic = mapAcceptanceTask.epicId;

            dbIssue.save(function (err) {
            callback(err);
        });
    });
}


function SaveLinkedIssue(linkedIssue, callback) {
    Issue.findOne({key: linkedIssue.key}, function (err, dbIssue) {
        if (err) {
            callback(err);
        }

        if (!dbIssue) {
            dbIssue = new Issue();
        }

        dbIssue.key = linkedIssue.key;
        dbIssue.uri = "https://jira.epam.com/jira/browse/" + linkedIssue.key;
        dbIssue.type = linkedIssue.fields.issuetype.name;
        dbIssue.summary = linkedIssue.fields.summary;
        dbIssue.status = linkedIssue.fields.status.name;
        dbIssue.resolution = linkedIssue.fields.resolution == null ? "" : linkedIssue.fields.resolution.name;
        dbIssue.reporter = linkedIssue.fields.reporter.displayName;
        dbIssue.originalEstimate = linkedIssue.fields.timetracking.originalEstimate;
        dbIssue.timeSpent = linkedIssue.fields.timetracking.timeSpent;

        dbIssue.created = linkedIssue.fields.created;
        dbIssue.updated = linkedIssue.fields.updated;

        dbIssue.labels = linkedIssue.fields.labels;
        if (linkedIssue.fields.assignee != null)
            dbIssue.assignee = linkedIssue.fields.assignee.displayName;

        dbIssue.pages = [];
        _.each(linkedIssueUniqList[linkedIssue.key].linkedPages, function (linkedPage) {
            dbIssue.pages.push({linkType: linkedPage.linkType, page: linkedPage._id});
        });

        dbIssue.save(function (err) {
            callback(err);
        });
    });
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

        if (from == STATUS.INPROGRESS.name && to == STATUS.READYFORQA.name && page.devFinished == null ||
            from == STATUS.CODEREVIEW.name && to == STATUS.READYFORQA.name && page.devFinished == null) {
            page.devFinished = created;
        }
        if (from == STATUS.TESTINGINPROGRESS.name && to == STATUS.RESOLVED.name) {
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









