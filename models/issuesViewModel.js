/**
 * Created by Heorhi_Vilkitski on 8/5/2014.
 */
exports.issues = function () {
    this.issues = [
        {


        }];
};

exports.issue = function(key, reporter, timeSpent, lables, assignee, linkedPages){
    this.key = key || "";
    this.reporter = reporter || "";
    this.timeSpent = timeSpent || "";
    this.labels = lables || [];
    this.assignee = assignee || "";
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