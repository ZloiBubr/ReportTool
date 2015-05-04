/**
 * Created by Heorhi_Vilkitski on 8/5/2014.
 */
var mongoose = require('../libs/mongoose');
var Module = require('../models/module').Module;
var Page = require('../models/page').Page;
var Issue = require('../models/issue').Issue;
var issuesViewModel = require('../models/issuesViewModel');
var log = require('../libs/log')(module);
var helpers = require('../middleware/helpers');

var _ = require('underscore');
var cache = require('node_cache');
var statusExport = require('../public/jsc/Models/statusList');
var statusList = new statusExport.Statuses();



exports.getData = function (req, res) {
    cache.getData("issueData",function(setterCallback){
        parsePages(function (err, data) {
            if (err) throw err;
            setterCallback(data);
        });
    }, function(value){res.json(value);});
};

function parsePages(callback) {
    Module.find({}).exec(function(err, modules){
        var modulesHash = getRemapedModuleCollection(modules);
        Issue.find({})
            .populate('pages.page')
            .exec(function (err, issues) {
                var issueList = new issuesViewModel.Issues();

                if (err) {
                    callback(err);
                }

                _.each(issues, function (dbIssue) {

                    if(dbIssue.status == statusList.accepted.name ||
                        dbIssue.status == statusList.cancelled.name ||
                        dbIssue.status == statusList.resolved.name ||
                        dbIssue.status == statusList.readyForQA.name ||
                        dbIssue.status == statusList.codeReview.name ||
                        dbIssue.status == statusList.closed.name
                        )
                    {
                        return;
                    }

                    var linkedPages = [];
                    _.each(dbIssue.pages, function (dbPageItem) {
                        var dbPage = dbPageItem.page;
                        var module = modulesHash[dbPage.epicKey];
                        if(module)
                        {
                            dbPage.dueDate = module.duedate;
                        }
                        else{
                            console.error("issuesDataProvider.js page without module was found");
                        }

                        var linkedPage = new issuesViewModel.LinkedPage(dbPage.key, dbPage.reporter, dbPage.timeSpent, dbPage.labels, dbPage.assignee, helpers.getTeamName(dbPage.labels), dbPage.dueDate || "");
                        linkedPages.push(new issuesViewModel.Link(dbPageItem.linkType, linkedPage));
                    });

                    var issue = new issuesViewModel.Issue(
                        dbIssue.key,
                        dbIssue.type,
                        dbIssue.status,
                        dbIssue.reporter,
                        dbIssue.timeSpent,
                        dbIssue.labels.split(','),
                        dbIssue.assignee,
                        dbIssue.updated,
                        linkedPages
                    );

                    issueList.issues.push(issue);
                });

                callback(err, issueList.issues);
            });
    });

}

function getRemapedModuleCollection(modules){
    var result = [];
    _.each(modules, function(module){
        result[module.key] = module;
    });
    return result;
}

