/**
 * Created by Heorhi_Vilkitski on 7/1/2014.
 */

exports.statusEntity = function(name)
{
    this.name = name || "";
    this.count = 0;
    this.isChecked = true;
    this.weight = 0;
};

exports.statuses = function() {
    this.blocked = new exports.statusEntity("Blocked");
    this.open = new exports.statusEntity("Open");
    this.deferred = new exports.statusEntity("Deferred");
    this.assigned = new exports.statusEntity("Assigned"); //+reopen
    this.inProgress = new exports.statusEntity("In Progress");
    this.codeReview = new exports.statusEntity("Code Review");
    this.readyForQA = new exports.statusEntity("Ready for QA");
    this.testingInProgress = new exports.statusEntity("Testing in Progress");
    this.resolved = new exports.statusEntity("Resolved");
    this.accepted = new exports.statusEntity("Accepted");//(closed)
    this.closed = new exports.statusEntity("Closed");
    this.cancelled = new exports.statusEntity("Cancelled");
    this.pages = 0;

    this.blocked.weight = 0;
    this.open.weight = 1;
    this.deferred.weight = 2;
    this.assigned.weight = 3;
    this.inProgress.weight = 4;
    this.codeReview.weight = 5;
    this.readyForQA.weight = 6;
    this.testingInProgress.weight = 7;
    this.resolved.weight = 8;
    this.accepted.weight = 9;
    this.cancelled.weight = 10;

    this.getStatusByName = function(statusName){
        switch(statusName)
        {
            case "Open":
                return this.open;
            case "Deferred":
                return this.deferred;
            case "Assigned":
                return this.assigned;
            case "In Progress":
                return this.inProgress;
            case "Code Review":
                return this.codeReview;
            case "Accepted":
                return this.accepted;
            case "Ready for QA":
                return this.readyForQA;
            case "Testing in Progress":
                return this.testingInProgress;
            case "Resolved":
                return this.resolved;
            case "Blocked":
                return this.blocked;
            case "Cancelled":
                return this.cancelled;
            default :
                return this.blocked;
        }
    }
};




