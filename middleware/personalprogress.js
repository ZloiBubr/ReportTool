var mongoose = require('../libs/mongoose');
var Module = require('../models/module').Module;
var Page = require('../models/page').Page;
var teamsModels = require('../models/teamPersonalProgress');
var log = require('../libs/log')(module);
var AllTeams = require('../public/jsc/allteams').AllTeams;
var async = require('async');
var _ = require('underscore');

exports.getData = function (req, res) {
    parsePages(function (err, personaldata) {
        if (err) throw err;
        res.json(personaldata);
    });
}

function fillPersonalData(teamPersonalProgress) {
    _.each(AllTeams.teams, function (team) {
        var pteam = new teamsModels.Team(team.name);
        teamPersonalProgress.teams.push(pteam);
        _.each(team.developers, function (developerName) {
            pteam.developers.push(new teamsModels.Developer(developerName));
        })
    })
}

function parsePages(callback) {
    var teamsModel = new teamsModels.TeamPersonalProgress();
    fillPersonalData(teamsModel);

    teamsModel.startDate.setHours(0, 0, 0, 0);
    teamsModel.endDate.setHours(0, 0, 0, 0);
    teamsModel.startDate.setDate(teamsModel.startDate.getDate() - 14);

    async.each(teamsModel.teams, function (team, teamCallback) {
        async.each(team.developers, function (developer, developerCallback) {
            Page.find({worklogHistory: {$elemMatch: {person: developer.name, dateChanged: {$gte: teamsModel.startDate, $lte: teamsModel.endDate}}}},
                function (err, pages) {
                    for (var d = new Date(teamsModel.startDate.getTime()); d <= teamsModel.endDate; d.setDate(d.getDate() + 1)) {
                        _.each(pages, function (pageItem) {

                            var progressDetail = _.find(developer.progressDetails, function (progressDetailedItem) {
                                return progressDetailedItem.date.getTime() == d.getTime()
                            });

                            if (_.isUndefined(progressDetail)){
                                progressDetail = new teamsModels.ProgressDetail(new Date(d));
                                developer.progressDetails.push(progressDetail)
                            }

                            _.each(pageItem.worklogHistory, function (worklogItem) {
                                if (worklogItem.person == developer.name && datesCompareHelper(worklogItem.dateStarted, d)) {



                                    var page = _.find(progressDetail.pages, function (tpageItem) {
                                        return tpageItem.pageId == pageItem.key
                                    });
                                    if (_.isUndefined(page)) {
                                        page = new teamsModels.Page(pageItem.key);
                                        progressDetail.pages.push(page);
                                    }

                                    var hours = parseFloat(worklogItem.timeSpent);
                                    page.HR += hours;
                                    progressDetail.totalHR += hours;
                                    developer.totalHR += hours;
                                }
                            });

//                    _.each(pageItem.progressHistory, function (progresHistoryItem) {
//                        if (datesCompareHelper(progresHistoryItem.dateChanged, d)) {
//                            var page = _.find(progressDetail.pages, function (tpageItem) {
//                                return tpageItem.pageId == pageItem.key
//                            });
//                            if (_.isUndefined(page)) {
//                                page = new teamsModels.Page(pageItem.key);
//                                progressDetail.pages.push(page);
//                            }
//
//                            var from = _.isNumber(progresHistoryItem.progressFrom) ? parseInt(progresHistoryItem.progressFrom) : 0;
//                            var to = _.isNumber(progresHistoryItem.progressTo) ? parseInt(progresHistoryItem.progressTo) : 0;
//                            var progress = (to - from) * pageItem.storyPoints / 100;
//
//                            page.SP += progress;
//                            progressDetail.totalSP += progress;
//                            developer.totalSP += progress;
//                        }
//                    });

                        })
                    }
                    developerCallback();
                })
        }, function (err) {
            teamCallback(err);
        })
    }, function (err) {
        callback(err, teamsModel);
    })

}

function datesCompareHelper(date1, date2) {
    var timeZeroDate1 = new Date(date1);
    timeZeroDate1.setHours(0, 0, 0, 0);
    return timeZeroDate1.getTime() == date2.getTime();
}

