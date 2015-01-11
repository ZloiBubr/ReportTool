var STATUS = require('../public/jsc/models/statusList').STATUS;
var RESOLUTION = require('../public/jsc/models/statusList').RESOLUTION;
var persons = require('./persons');

exports.getTeamName = function (labels) {
    var labelsArray = labels.split(',');
    for(var i=0; i<labelsArray.length; i++) {
        var label = labelsArray[i];
        if(label.indexOf("Team") == 0) {
            return labelsArray[i].substring(4);
        } else if (label == "Automation") {
            return "Automation";
        }
    }
    return "--";
};

exports.getModuleGroupName = function(labels) {
    var labelsArray = labels.split(',');
    for(var i=0; i<labelsArray.length; i++) {
        var label = labelsArray[i];
        if(label.indexOf("PageModuleGroup_") == 0) {
            return labelsArray[i].substring(16);
        }
    }
    return "PageModuleGroup--";
};

exports.getModuleName= function(labels) {
    var labelsArray = labels.split(',');
    for(var i=0; i<labelsArray.length; i++) {
        var label = labelsArray[i];
        if(label.indexOf("PageModule_") == 0) {
            return labelsArray[i].substring(11);
        }
    }
    return "PageModule--";
};

exports.getCloudAppName = function(labels) {
    var labelsArray = labels.split(',');
    for(var i=0; i<labelsArray.length; i++) {
        var label = labelsArray[i];
        if(label.indexOf("CloudApp_") == 0) {
            if(label == "CloudApp_ParentPage") {
                continue;
            }
            return labelsArray[i].substring(9);
        }
    }
    return "CloudApp--";
};

exports.isParentPage = function(labels) {
    var labelsArray = labels.split(',');
    for(var i=0; i<labelsArray.length; i++) {
        var label = labelsArray[i];
        if(label.indexOf("CloudApp_ParentPage") == 0) {
            return true;
        }
    }
    return false;
};

exports.getChecklistsProgress = function(item) {
    if(!item.checklistCreated) {
        return 0;
    }
    var count = 0;
    for(var i=0; i<item.checklistCreated.length; i++) {
        if(item.checklistCreated[i] == true) {
            count++;
        }
    }
    return count*100 / item.pages;
};

exports.getWaveName = function(labels) {
    var labelsArray = labels.split(',');
    for(var i=0; i<labelsArray.length; i++) {
        var label = labelsArray[i];
        if(label.indexOf("Wave") == 0) {
            return label;
        }
    }
    return "Wave--";
};

exports.getStreamName = function(labels) {
    var labelsArray = labels.split(',');
    for(var i=0; i<labelsArray.length; i++) {
        var label = labelsArray[i];
        if(label.indexOf("Stream") == 0) {
            return labelsArray[i].substring(6);
        }
    }
    return "--";
};

exports.getDueDateConfirmed = function(labels) {
    var labelsArray = labels.split(',');
    for(var i=0; i<labelsArray.length; i++) {
        var label = labelsArray[i];
        if(label.indexOf("DueDateConfirmed") == 0) {
            return true;
        }
    }
    return false;
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




