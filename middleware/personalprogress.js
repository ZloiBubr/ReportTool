var mongoose = require('../libs/mongoose');
var Module = require('../models/module').Module;
var Page = require('../models/page').Page;
var TeamModels = require('../models/teamPersonalProgress');
var log = require('../libs/log')(module);
var AllTeams = require('../public/jsc/allteams').AllTeams;
var async = require('async');
var _ = require('underscore');

exports.getData = function (req, res) {
    var fromDate = req.params.fromDate ? new Date(req.params.fromDate) : undefined;
    var toDate = req.params.toDate ? new Date(req.params.toDate) : undefined;

    if(_.isUndefined(fromDate) || _.isUndefined(toDate) || fromDate.getFullYear() <= 1970 || toDate.getFullYear() <= 1970){
        res.end();
    }else {
        parsePages(fromDate, toDate, function (err, personaldata) {
            if (err) throw err;
            res.json(personaldata);
        });
    }
};

function fillPersonalData(teamPersonalProgress) {
    _.each(AllTeams.teams, function (team) {
        var pteam = new TeamModels.Team(team.name);
        teamPersonalProgress.teams.push(pteam);
        _.each(team.developers, function (developerName) {
            pteam.developers.push(new TeamModels.Developer(developerName));
        });
    });
}

function parsePages(fromDate, toDate, callback) {
    var teamsModel = new TeamModels.TeamPersonalProgress();
    fillPersonalData(teamsModel);



    if(fromDate && toDate){
        teamsModel.startDate = fromDate;
        teamsModel.endDate = toDate;
        teamsModel.startDate.setHours(0, 0, 0, 0);
        teamsModel.endDate.setHours(0, 0, 0, 0);
    }
    else {
        teamsModel.startDate.setHours(0, 0, 0, 0);
        teamsModel.endDate.setHours(0, 0, 0, 0);
        var daysPeriod = 14;
        teamsModel.startDate.setDate(teamsModel.startDate.getDate() - daysPeriod);
    }



    async.each(teamsModel.teams, function (team, teamCallback) {
        async.each(team.developers, function (developer, developerCallback) {

            Page.find({progressHistory: {$elemMatch: {person: developer.name, dateChanged: {$gte: teamsModel.startDate, $lte: teamsModel.endDate}}}},
                function(err, ProgressPages){
                    Page.find({worklogHistory: {$elemMatch: {person: developer.name, dateStarted: {$gte: teamsModel.startDate, $lte: teamsModel.endDate}}}},
                        function (err, workLogPages) {

                            var workLogPages = _.uniq(_.union(ProgressPages,workLogPages),false,function(item){return item.key;});

                            var effectiveDays = 0;
                            for (var d = new Date(teamsModel.startDate.getTime()); d <= teamsModel.endDate; d.setDate(d.getDate() + 1)) {
                                var progressDetail = _.find(developer.progressDetails, function (progressDetailedItem) {
                                    return progressDetailedItem.date.getTime() == d.getTime();
                                });

                                if (_.isUndefined(progressDetail)) {
                                    progressDetail = new TeamModels.ProgressDetail(d);
                                    developer.progressDetails.push(progressDetail);
                                }

                                _.each(workLogPages, function (pageItem) {
                                    parseWorklogHistory (d, developer, progressDetail, pageItem);
                                    parseProgressHistory (d, developer, progressDetail, pageItem);
                                });

                                if(progressDetail.totalSP != 0 || progressDetail.totalHR != 0){
                                    effectiveDays++;
                                }
                            }

                            developer.avgSP =  developer.totalSP/(effectiveDays || 1);
                            developer.avgSPOnAllDays =  developer.totalSP/daysPeriod;
                            developer.avgSPinHour =  developer.totalSP/(developer.totalHR || 1);

                            parseStatusClosed(developer, ProgressPages);

                            team.totalTeamSP += developer.totalSP;
                            team.totalTeamHR += developer.totalHR;

                            if(developer.avgSP)
                            {
                                team.totalAvgSP += developer.avgSP;
                            }

                            if(developer.avgSPinHour)
                            {
                                team.totalAvgSPinHour += developer.avgSPinHour;
                            }

                            if(developer.totalAcceptedSP)
                            {
                                team.totalTeamAcceptedSP += developer.totalAcceptedSP;
                            }

                            developerCallback();
                        });

                });

        }, function (err) {
            teamCallback(err);
        });
    }, function (err) {
        callback(err, teamsModel);
    });
}

function parseWorklogHistory (day, developer, progressDetail, pageItem)
{
    _.each(pageItem.worklogHistory, function (worklogItem) {
        if (worklogItem.person == developer.name && datesCompareHelper(worklogItem.dateStarted, day)) {

            var page = _.find(progressDetail.pages, function (tpageItem) {
                return tpageItem.pageId == pageItem.key;
            });
            if (_.isUndefined(page)) {
                page = new TeamModels.Page(pageItem.key);
                progressDetail.pages.push(page);
            }

            var hours = parseFloat(worklogItem.timeSpent);
            page.HR += hours;
            progressDetail.totalHR += hours;
            developer.totalHR += hours;
        }
    });
}

function parseProgressHistory (day, developer, progressDetail, pageItem) {
    _.each(pageItem.progressHistory, function (progresHistoryItem) {
        if (progresHistoryItem.person == developer.name && datesCompareHelper(progresHistoryItem.dateChanged, day)) {

            var page = _.find(progressDetail.pages, function (tpageItem) {
                return tpageItem.pageId == pageItem.key;
            });

            if (_.isUndefined(page)) {
                page = new TeamModels.Page(pageItem.key);
                progressDetail.pages.push(page);
            }

            var from = parseInt(progresHistoryItem.progressFrom);
            var to = parseInt(progresHistoryItem.progressTo);
            from = isNaN(from) ? 0 : from;
            to = isNaN(to) ? 0 : to;

            var progress = (to - from) * pageItem.storyPoints / 100;

            page.SP += progress;
            progressDetail.totalSP += progress;
            developer.totalSP += progress;
        }
    });
}

function parseStatusClosed(developer, pages) {
    _.each(pages, function (pageItem) {
        if (pageItem.status == "Closed" && pageItem.resolution == "Done" && pageItem.progress == "100")
        {
            developer.totalAcceptedSP += parseFloat(pageItem.storyPoints);
        }
    });
}


function datesCompareHelper(date1, date2) {
    var timeZeroDate1 = new Date(date1);
    timeZeroDate1.setHours(0, 0, 0, 0);
    return timeZeroDate1.getTime() == date2.getTime();
}

