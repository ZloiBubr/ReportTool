var AllTeams = require ('../public/jsc/allteams').AllTeams;
var oldDevelopers = require ('../public/jsc/allteams').OldDevelopers;

exports.isDeveloper = function (name) {
    for(var i=0; i<AllTeams.teams.length-1; i++) {
        var team = AllTeams.teams[i];
        for(var j=0; j< team.developers.length; j++) {
            if(team.developers[j] == name) {
                return true;
            }
        }
    }
    if(oldDevelopers(name)) {
        return true;
    }
    return false;
};

