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

