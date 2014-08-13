/**
 * Created by Heorhi_Vilkitski on 8/5/2014.
 */
exports.issues = function () {
    this.issues = [
        {


        }];
};

exports.issue = function(key, type, status, reporter, timeSpent, lables, assignee, updated, linkedPages){
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

exports.link = function(linkType, page){
    this.linkType = linkType || "";
    this.page = page || new exports.linkedPage();
}

exports.linkedPage = function(key, reporter, timeSpent, labels, assignee, team){
    this.key = key || "";
    this.reporter = reporter || "";
    this.timeSpent = timeSpent || "";
    this.labels = labels || [];
    this.assignee = assignee || "";
    this.team = team || "";
};