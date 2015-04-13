/**
 * Created by Heorhi_Vilkitski on 4/3/2015.
 */

var mongoose = require('../libs/mongoose');
var _ = require('underscore');
var Issues = require('../models/originalJiraIssue').Issue;
var cache = require('node_cache');
var Q = require('q');



exports.getData = function (req, res) {
    var teamName = _.isEmpty(req.query.team) ? undefined : req.query.team;
    var month = _.isEmpty(req.query.month) ? undefined : req.query.month;

    cache.getData("exportStories_" + teamName + "_" + month,function(setterCallback){
        parsePages(teamName, month, function (err, data) {
            if (err) throw err;
            setterCallback(data);
        });
    }, function(value){
        res.json(value);
    });
    //res.json({item1:1, item2:1, item3:1, item4:1 });
};


function parsePages(teamName, month, callback) {
    var request = {
        issuetype: "Epic",
        "object.fields.labels" : {"$in":[teamName]},
        "object.fields.status.name" : {"$ne": "Closed"}
    };

    var result = {
        modules: []
    };

    Issues.find(request)
        .exec(function (err, epics) {
            if (err) throw err;

            Q.all(function(){
                var promises = [];
                _.each(epics, function(epic){

                    var date = new Date(epic.object.fields.duedate);
                    if(date.getMonth()+1 == month){
                        var module ={
                            moduleKey : epic.key,
                            moduleName : epic.object.fields.summary,
                            stories: []
                        };

                        result.modules.push(module);
                        promises.push(fillStories(module.stories, epic.key, epic.object.fields.summary));
                    }

                });

                return promises;

            }()).done(function(){
                callback(err,result);
            })

        });
};

function fillStories (storiesArray, epickey, epicsummary){
    var deffered = Q.defer();

    var request = {
        issuetype: "Story",
        "object.fields.customfield_14500" : epickey
    };

    Issues.find(request)
        .exec(function(err, stories){
            if (err){
                throw err;
                deffered.reject(err);
            }
    _.each(stories, function (story) {
        var storyItem = {};
        storyItem.key = story.key;
        storyItem.summary = story.object.fields.summary;
        storyItem.size = story.object.fields.customfield_10004;
        storyItem.progress = story.object.fields.customfield_20500;
        storyItem.assignee = story.object.fields.assignee != null ? story.object.fields.assignee.displayName : "Unassigned";
        storyItem.status = story.object.fields.status.name;
        storyItem.epicKey = epickey;
        storyItem.epicSummary = epicsummary;

        storiesArray.push(storyItem);
    });
            deffered.resolve();

        });

    return deffered.promise;
}