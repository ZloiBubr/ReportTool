exports.STATUS = {
    BLOCKED: { value: 0, name: "Blocked", icon: "glyphicon glyphicon-remove"},
    OPEN : {value: 1, name: "Open", icon: "glyphicon glyphicon-inbox"},
    REOPENED : {value: 2, name: "Reopened", icon: "glyphicon glyphicon-inbox"},
    DEFERRED: {value: 3, name: "Deferred", icon: "glyphicon glyphicon-time"},
    ASSIGNED : {value: 4, name: "Assigned", icon: "glyphicon glyphicon-user"},
    INPROGRESS : {value: 5, name: "In Progress", icon: "glyphicon glyphicon-play"},
    CODEREVIEW : { value: 6, name: "Code Review", icon: "glyphicon glyphicon-eye-open"},
    READYFORQA: { value: 7, name: "Ready for QA", icon: "glyphicon glyphicon-th-list"},
    TESTINGINPROGRESS: { value: 8, name: "Testing in Progress", icon: "glyphicon glyphicon-road"},
    RESOLVED: { value: 9, name: "Resolved", icon: "glyphicon glyphicon-check"},
    CLOSED: { value: 10, name: "Closed", icon: "glyphicon glyphicon-star"},
    PRODUCTION: { value: 11, name: "Ready for PM Handoff", icon: "glyphicon glyphicon-star"},
    PMREVIEW: { value: 12, name: "PM Review", icon: "glyphicon glyphicon-star"},
    LAREADY: { value: 13, name: "LA Ready", icon: "glyphicon glyphicon-star"},
    ACCEPTED: { value: 14, name: "Accepted", icon: "glyphicon glyphicon-star"},
    CANCELED: { value: 15, name: "Canceled", icon: "glyphicon glyphicon-ban-circle"},
    NOTAPPLICABLE: { value: 16, name: "Not Applicable", icon: "glyphicon glyphicon-ban-circle"}
};

exports.RESOLUTION = {
    DONE : { name: "Done" },
    FIXED : { name: "Fixed" },
    IMPLEMENTED : { name: "Implemented" },
    OUTOFSCOPE: { name: "Out of Scope" },
    REJECTED: { name: "Rejected" },
    CANCELED: { name: "Canceled" },
    ACCEPTED: { name: "Accepted" },
    DUPLICATE: { name: "Duplicate" },
    OBSOLETE: { name: "Obsolete" }
};

exports.isAccepted = function(status) {
   return status == exports.STATUS.ACCEPTED.name || status == exports.STATUS.PRODUCTION.name;
};

exports.statusEntity = function(status)
{
    this.name = status.name || "";
    this.isChecked = true;
    this.weight = status.value;
    this.cssIcon = status.icon || "";
    this.count = 0;
};

exports.getPriorityNumber = function(priorityText) {
    return priorityText == "Blocker" ? 1 :
        priorityText == "Critical" ? 2 :
            priorityText == "Major" ? 3 :
                priorityText == "Minor" ? 4 :
                    priorityText == "Trivial" ? 5 : 0;
};


exports.statuses = function() {
    this.blocked = new exports.statusEntity(exports.STATUS.BLOCKED);
    this.open = new exports.statusEntity(exports.STATUS.OPEN);
    this.reopened = new exports.statusEntity(exports.STATUS.REOPENED);
    this.deferred = new exports.statusEntity(exports.STATUS.DEFERRED);
    this.assigned = new exports.statusEntity(exports.STATUS.ASSIGNED);
    this.inProgress = new exports.statusEntity(exports.STATUS.INPROGRESS);
    this.codeReview = new exports.statusEntity(exports.STATUS.CODEREVIEW);
    this.readyForQA = new exports.statusEntity(exports.STATUS.READYFORQA);
    this.testingInProgress = new exports.statusEntity(exports.STATUS.TESTINGINPROGRESS);
    this.resolved = new exports.statusEntity(exports.STATUS.RESOLVED);
    this.accepted = new exports.statusEntity(exports.STATUS.ACCEPTED);
    this.production = new exports.statusEntity(exports.STATUS.PRODUCTION);
    this.closed = new exports.statusEntity(exports.STATUS.CLOSED);
    this.cancelled = new exports.statusEntity(exports.STATUS.CANCELED);
    this.notApplicable = new exports.statusEntity(exports.STATUS.NOTAPPLICABLE);

    this.getStatusByName = function(statusName){
        switch(statusName)
        {
            case exports.STATUS.OPEN.name:
                return this.open;
            case exports.STATUS.REOPENED.name:
                return this.reopened;
            case exports.STATUS.DEFERRED.name:
                return this.deferred;
            case exports.STATUS.ASSIGNED.name:
                return this.assigned;
            case exports.STATUS.INPROGRESS.name:
                return this.inProgress;
            case exports.STATUS.CODEREVIEW.name:
                return this.codeReview;
            case exports.STATUS.ACCEPTED.name:
                return this.accepted;
            case exports.STATUS.PRODUCTION.name:
                return this.production;
            case exports.STATUS.READYFORQA.name:
                return this.readyForQA;
            case exports.STATUS.TESTINGINPROGRESS.name:
                return this.testingInProgress;
            case exports.STATUS.RESOLVED.name:
                return this.resolved;
            case exports.STATUS.BLOCKED.name:
                return this.blocked;
            case exports.STATUS.CANCELED.name:
                return this.cancelled;
            case exports.STATUS.CLOSED.name:
                return this.closed;
            case exports.STATUS.NOTAPPLICABLE.name:
                return this.notApplicable;
            default :
                return this.blocked;
        }
    }
    this.resetCounters = function(){
        this.blocked.count = 0;
        this.open.count = 0;
        this.reopened.count = 0;
        this.deferred.count = 0;
        this.assigned.count = 0;
        this.inProgress.count = 0;
        this.codeReview.count = 0;
        this.readyForQA.count = 0;
        this.testingInProgress.count = 0;
        this.resolved.count = 0;
        this.accepted.count = 0;
        this.production.count = 0;
        this.closed.count = 0;
        this.cancelled.count = 0;
        this.notApplicable.count = 0;
    }
};




