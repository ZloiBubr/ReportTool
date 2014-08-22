/**
 * Created by Heorhi_Vilkitski on 7/1/2014.
 */

exports.statusEntity = function(name, cssIcon)
{
    this.name = name || "";
    this.count = 0;
    this.isChecked = true;
    this.weight = 0;
    this.cssIcon = cssIcon || "";
};

exports.statuses = function() {
    this.blocked = new exports.statusEntity("Blocked","glyphicon glyphicon-remove");
    this.open = new exports.statusEntity("Open","glyphicon glyphicon-inbox");
    this.deferred = new exports.statusEntity("Deferred","glyphicon glyphicon-time");
    this.assigned = new exports.statusEntity("Assigned","glyphicon glyphicon-user"); //+reopen
    this.inProgress = new exports.statusEntity("In Progress","glyphicon glyphicon-play");
    this.codeReview = new exports.statusEntity("Code Review","glyphicon glyphicon-eye-open");
    this.readyForQA = new exports.statusEntity("Ready for QA","glyphicon glyphicon-th-list");
    this.testingInProgress = new exports.statusEntity("Testing in Progress","glyphicon glyphicon-road");
    this.resolved = new exports.statusEntity("Resolved","glyphicon glyphicon-check");
    this.accepted = new exports.statusEntity("Accepted","glyphicon glyphicon-star");//(closed)
    this.closed = new exports.statusEntity("Closed","glyphicon glyphicon-star");
    this.cancelled = new exports.statusEntity("Cancelled","glyphicon glyphicon-ban-circle");
    this.notApplicable = new exports.statusEntity("Not Applicable","glyphicon glyphicon-ban-circle");
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
    this.notApplicable.weight = 11;

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
            case "Closed":
                return this.closed;
            case "Not Applicable":
                return this.notApplicable;
            default :
                return this.blocked;
        }
    }
};




