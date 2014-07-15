/**
 * Created by Heorhi_Vilkitski on 7/1/2014.
 */

exports.statusEntity = function()
{
    this.count = 0;
    this.isChecked = true;
    this.weight = 0;
};

exports.statuses = function() {
    this.blocked = new exports.statusEntity();
    this.open = new exports.statusEntity();
    this.deferred = new exports.statusEntity();
    this.assigned = new exports.statusEntity(); //+reopen
    this.inProgress = new exports.statusEntity();
    this.codeReview = new exports.statusEntity();
    this.readyForQA = new exports.statusEntity();
    this.testingInProgress = new exports.statusEntity();
    this.resolved = new exports.statusEntity();
    this.accepted = new exports.statusEntity();//(closed)
    this.cancelled = new exports.statusEntity();
    this.pages = 0;

    this.blocked.weight = 0;
    this.open.weight = 1;
    this.deferred.weight = 2;
    this.assigned.weight = 3; //+reopen
    this.inProgress.weight = 4;
    this.codeReview.weight = 5;
    this.readyForQA.weight = 6;
    this.testingInProgress.weight = 7;
    this.resolved.weight = 8;
    this.accepted.weight = 9;//(closed)
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
//            case "Reopened":
//                return this.reopened;
//            case "":
//                return this.unspecified;
        }
    }
};




