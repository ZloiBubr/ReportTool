/**
 * Created by Siarhei Hladkou (shladkou) on 2/26/14.
 */
var util = require('util');
var config = require('config');

JiraApi = require('jira').JiraApi;
var jira = new JiraApi('https', "jira.epam.com", 443, config.get("jiraUser"), config.get("jiraPassword"), '2');

function getIssue(issueKey) {
    jira.findIssue(issueKey + "?expand=changelog", function(error, issue) {
        if (issue == null) {
            console.log("empty response: " + error);
        }
        else
        {
            console.log("Summary: " + issue.fields.summary);
            console.log("Status: " + issue.fields.status.name);
            //console.log(issue.fields.timeoriginalestimate);
            //console.log(issue.fields.timespent);
            console.log("Reporter: " + issue.fields.reporter.displayName);
            //console.log(util.inspect(issue.fields.worklog));
            console.log("Original estimate: " + issue.fields.timetracking.originalEstimate);
            console.log("Time Spent: " + issue.fields.timetracking.timeSpent);
            console.log("Labels: " + issue.fields.labels);
            if(issue.fields.assignee != null)
                console.log("Assignee: " + issue.fields.assignee.displayName);
            console.log("Blockers: " + issue.fields.customfield_20501);
            console.log("Progress: " + issue.fields.customfield_20500);
            console.log("------------------- Changelog -----------------------");
            for(var i=0; i<issue.changelog.total; i++)
            {
                var history = issue.changelog.histories[i];
                var author = history.author.displayName;
                //console.log(util.inspect(history.items));
                for(var y=0; y<history.items.length; y++){
                    if(history.items[y].fieldtype == 'custom' && history.items[y].field == 'Progress')
                    {
                        console.log(history.created);
                        console.log("Author: " + author);
                        console.log(history.items[y].fromString + '->' + history.items[y].toString);
                        console.log("************************************");
                    }
                }
            }
        }
    });
}

function getProject() {
    jira.getProject("PLEXUXC", function(error, project) {
        if(project != null)
            console.log('Status: ' + project);
        else
            console.log("empty response: " + error);
    });
}

function searchEpics() {
    jira.searchJira("project = PLEX-UXC AND issuetype = epic AND summary ~ Module AND NOT summary ~ automation ORDER BY key ASC", null, function(error, epics) {
        if(epics != null){
            //console.log('Status: ' + util.inspect(epics));
            for(var i=0; i<epics.issues.length; i++){
                var epic = epics.issues[i];
                console.log(epic.key);
                console.log(epic.fields.summary);
            }
        }
        else
            console.log("empty response: " + error);
    });
}

function searchStories(epicKey) {
    jira.searchJira(util.format("project = PLEXUXC AND issuetype = Story AND 'Epic Link' in (%s)",epicKey), null, function(error, stories) {
        if(stories != null){
            //console.log('Status: ' + util.inspect(stories));
            //console.log("Story: " + util.inspect(stories.issues[0]));
            for(var i=0; i<stories.issues.length; i++){
                var story = stories.issues[i];
                console.log(story.key);
                console.log(story.fields.summary);
                getIssue(story.key.toString());
            }
        }
        else
            console.log("empty response: " + error);
    });
}

//searchEpics();
//searchStories("PLEXUXC-22");
getIssue("PLEXUXC-588");
//processRedis();






