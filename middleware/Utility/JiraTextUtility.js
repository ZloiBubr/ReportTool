/**
 * Created by Heorhi_Vilkitski on 8/8/2014.
 */

exports.getTeamName = function(labels) {
    if (labels.indexOf("TeamRenaissance") > -1)
        return "TeamRenaissance";
    if (labels.indexOf("TeamInspiration") > -1)
        return "TeamInspiration";
    if (labels.indexOf("TeamNova") > -1)
        return "TeamNova";
    if (labels.indexOf("TeamLiberty") > -1)
        return "TeamLiberty";
    if (labels.indexOf("TeamViva") > -1)
        return "TeamViva";
};

exports.getCloudAppName = function (labels) {
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
}

exports.getStreamName = function (labels) {
    var index = labels.indexOf("Stream");
    if(index < 0) {
        return "";
    }
    var index2 = labels.indexOf(',', index);
    if(index2 < 0) {
        index2 = labels.length;
    }

    return labels.substring(index+6,index2);
}

exports.getModuleName = function (labels) {
    var index = labels.indexOf("PageModule_");
    if(index < 0) {
        return "UnknownModule";
    }
    var index2 = labels.indexOf(',', index);
    if(index2 < 0) {
        index2 = labels.length;
    }

    return labels.substring(index+11,index2);
}
