/**
 * Created by Heorhi_Vilkitski on 8/5/2014.
 */
exports.Issues = function () {
    this.issues = [
        {


        }];
};

exports.Issue = function(key, type, status, reporter, timeSpent, lables, assignee, updated, linkedPages){
    this.key = key || "";
    this.type = type || "";
    this.status = status || "";
    this.reporter = reporter || "";
    this.timeSpent = timeSpent || "";
    this.labels = lables || [];
    this.assignee = assignee || "";
    this.updated = updated || "";
    this.linkedPages = linkedPages || [];
};

exports.Link = function(linkType, page){
    this.linkType = linkType || "";
    this.page = page || new exports.LinkedPage();
};

exports.LinkedPage = function(key, reporter, timeSpent, labels, assignee, team, dueDate){
    this.key = key || "";
    this.reporter = reporter || "";
    this.timeSpent = timeSpent || "";
    this.labels = labels || [];
    this.assignee = assignee || "";
    this.team = team || "";
    this.dueDate = dueDate || "";
};