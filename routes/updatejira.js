/**
 * Created by Siarhei Hladkou (shladkou) on 2/27/14.
 */

var jiraProvider = require('../middleware/jiraProvider');

exports.post = function (req, res) {
    var username = req.body.username;
    var password = req.body.password;
    var full = req.body.full == "true";

    jiraProvider.updateJiraInfo(full, username, password, function (err) {
        if (err) {
        }
    });
    res.send({});
};

exports.rememberResponse = function(req, res) {
    jiraProvider.rememberResponse(req, res);
};