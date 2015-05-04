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
    NOTAPPLICABLE: { value: 16, name: "Not Applicable", icon: "glyphicon glyphicon-ban-circle"},
    DECLINED: { value: 17, name: "Declined", icon: "glyphicon glyphicon-ban-circle"},
};

exports.RESOLUTION = {
    DONE : { name: "Done" },
    FIXED : { name: "Fixed" },
    IMPLEMENTED : { name: "Implemented" },
    OUTOFSCOPE: { name: "Out of Scope" },
    RESOLVED: { name: "Resolved" },
    REJECTED: { name: "Rejected" },
    CANCELED: { name: "Canceled" },
    ACCEPTED: { name: "Accepted" },
    DUPLICATE: { name: "Duplicate" },
    OBSOLETE: { name: "Obsolete" },
    APPROVED: { name: "Approved" }
};

exports.isAccepted = function(status) {
   return status == exports.STATUS.ACCEPTED.name || status == exports.STATUS.PRODUCTION.name;
};

exports.StatusEntity = function(status)
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


exports.Statuses = function() {
    this.blocked = new exports.StatusEntity(exports.STATUS.BLOCKED);
    this.open = new exports.StatusEntity(exports.STATUS.OPEN);
    this.reopened = new exports.StatusEntity(exports.STATUS.REOPENED);
    this.deferred = new exports.StatusEntity(exports.STATUS.DEFERRED);
    this.assigned = new exports.StatusEntity(exports.STATUS.ASSIGNED);
    this.inProgress = new exports.StatusEntity(exports.STATUS.INPROGRESS);
    this.codeReview = new exports.StatusEntity(exports.STATUS.CODEREVIEW);
    this.readyForQA = new exports.StatusEntity(exports.STATUS.READYFORQA);
    this.testingInProgress = new exports.StatusEntity(exports.STATUS.TESTINGINPROGRESS);
    this.resolved = new exports.StatusEntity(exports.STATUS.RESOLVED);
    this.accepted = new exports.StatusEntity(exports.STATUS.ACCEPTED);
    this.production = new exports.StatusEntity(exports.STATUS.PRODUCTION);
    this.closed = new exports.StatusEntity(exports.STATUS.CLOSED);
    this.cancelled = new exports.StatusEntity(exports.STATUS.CANCELED);
    this.notApplicable = new exports.StatusEntity(exports.STATUS.NOTAPPLICABLE);
    this.pmReview = new exports.StatusEntity(exports.STATUS.PMREVIEW);
    this.laReady = new exports.StatusEntity(exports.STATUS.LAREADY);

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
            case exports.STATUS.PMREVIEW.name:
                return this.pmReview;
            case exports.STATUS.LAREADY.name:
                return this.laReady;
            default :
                return this.blocked;
        }
    };
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
        this.pmReview.count = 0;
        this.laReady.count = 0;
    };
};

exports.VersionHelper = function() {
    this.isCoreVersion = function(versionName) {
        return versionName.toLowerCase().indexOf('1.0') > -1 ||
            versionName.toLowerCase().indexOf('2.0') > -1 ||
            versionName.toLowerCase().indexOf('3.0') > -1 ||
            versionName.toLowerCase().indexOf('4.0') > -1 ||
            versionName.toLowerCase().indexOf('5.0') > -1 ||
            versionName.toLowerCase().indexOf('6.0') > -1 ||
            versionName.toLowerCase().indexOf('7.0') > -1;
    };

    this.isQ1Version = function(versionName) {
        return versionName.toLowerCase().indexOf('2.0') > -1 ||
            versionName.toLowerCase().indexOf('3.0') > -1 ||
            versionName.toLowerCase().indexOf('4.0') > -1;
    };

    this.isQ2Version = function(versionName) {
        return versionName.toLowerCase().indexOf('5.0') > -1 ||
            versionName.toLowerCase().indexOf('6.0') > -1 ||
            versionName.toLowerCase().indexOf('7.0') > -1;
    };

    this.isQ3Version = function(versionName) {
        return versionName.toLowerCase().indexOf('8.0') > -1 ||
            versionName.toLowerCase().indexOf('9.0') > -1 ||
            versionName.toLowerCase().indexOf('10.0') > -1;
    };
};




