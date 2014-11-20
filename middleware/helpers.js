var STATUS = require('../public/jsc/models/statusList').STATUS;
var RESOLUTION = require('../public/jsc/models/statusList').RESOLUTION;
var persons = require('./persons');

exports.getTeamName = function (labels) {
    var index = labels.indexOf("Team");
    if(index < 0) {
        return "";
    }
    var index2 = labels.indexOf(',', index);
    if(index2 < 0) {
        index2 = labels.length;
    }

    return labels.substring(index+4,index2);
};

exports.getModuleGroupName = function(labels) {
    var index = labels.indexOf("PageModuleGroup_");
    if(index < 0) {
        return "UnknownModuleGroup";
    }
    var index2 = labels.indexOf(',', index);
    if(index2 < 0) {
        index2 = labels.length;
    }

    return labels.substring(index+16,index2);
};

exports.getModuleName= function(labels) {
    var index = labels.indexOf("PageModule_");
    if(index < 0) {
        return "UnknownModule";
    }
    var index2 = labels.indexOf(',', index);
    if(index2 < 0) {
        index2 = labels.length;
    }

    return labels.substring(index+11,index2);
};

exports.getCloudAppName = function(labels) {
    var indexpp = labels.indexOf("CloudApp_ParentPage");
    var index = labels.indexOf("CloudApp_");
    if(indexpp > -1 && indexpp == index) {
        index = labels.indexOf("CloudApp_", indexpp+1);
    }
    if(index < 0) {
        return "UnknownCloudApp";
    }
    var index2 = labels.indexOf(',', index);
    if(index2 < 0) {
        index2 = labels.length;
    }

    return labels.substring(index+9,index2);
};

exports.isParentPage = function(labels) {
    var indexpp = labels.indexOf("CloudApp_ParentPage");
    if(indexpp > -1) {
        return true;
    }
};

exports.getWaveName = function(labels) {
    var index = labels.indexOf("Wave");
    if(index < 0) {
        return "UnknownWave";
    }
    var index2 = labels.indexOf(',', index);
    if(index2 < 0) {
        index2 = labels.length;
    }

    return labels.substring(index,index2);
};

exports.getStreamName = function(labels) {
    var index = labels.indexOf("Stream");
    if(index < 0) {
        return "";
    }
    var index2 = labels.indexOf(',', index);
    if(index2 < 0) {
        index2 = labels.length;
    }

    return labels.substring(index+6,index2);
};

exports.getDueDateConfirmed = function(labels) {
    var index = labels.indexOf("DueDateConfirmed");
    if(index < 0) {
        return false;
    }
    return true;
};

exports.isActive = function(status, resolution) {
    return !(status == STATUS.CLOSED.name &&
    (resolution == RESOLUTION.OUTOFSCOPE.name ||
    resolution == RESOLUTION.OBSOLETE.name ||
    resolution == RESOLUTION.DUPLICATE.name ||
    resolution == RESOLUTION.REJECTED.name ||
    resolution == RESOLUTION.CANCELED.name));
};

exports.updateStatus = function(status, resolution) {
    var newStatus = status;
    if(status == STATUS.CLOSED.name && (
        resolution == RESOLUTION.DONE.name ||
        resolution == RESOLUTION.FIXED.name ||
        resolution == RESOLUTION.IMPLEMENTED.name
        )) {
        newStatus = STATUS.ACCEPTED.name;
    }
    if(status == STATUS.CLOSED.name && (
        resolution == RESOLUTION.CANCELED.name ||
        resolution == RESOLUTION.REJECTED.name ||
        resolution == RESOLUTION.OUTOFSCOPE.name ||
        resolution == RESOLUTION.OBSOLETE.name
        )) {
        newStatus = STATUS.CANCELED.name;
    }
    return newStatus;
};

exports.getTimeSpent = function(page) {
    var devTimeSpent = 0;
    var qaTimeSpent = 0;
    for (var j = 0; j < page.worklogHistory.length; j++) {
        var workLog = page.worklogHistory[j];
        var isDeveloper = persons.isDeveloper(workLog.person);
        if(isDeveloper) {
            devTimeSpent += parseFloat(workLog.timeSpent);
        }
        else {
            qaTimeSpent += parseFloat(workLog.timeSpent);
        }
    }
    return { devTimeSpent: devTimeSpent, qaTimeSpent: qaTimeSpent };
};

exports.isBlocked = function(status) {
    return status == STATUS.BLOCKED.name;
};

exports.isDeferred = function(status) {
    return status == STATUS.DEFERRED.name;
};




