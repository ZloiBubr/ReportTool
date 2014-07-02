/**
 * Created by Siarhei Hladkou (shladkou) on 2/27/14.
 */

var jiraProvider = require('../middleware/jiraProvider');

exports.post = function (req, res, next) {
    var username = req.body.username;
    var password = req.body.password;
    var full = req.body.full == "true" ? true : false;

    jiraProvider.updateJiraInfo(full, username, password, function (err) {
        if (err) {
        }
    });
    res.send({});
};

exports.rememberResponse = function(res) {
    jiraProvider.rememberResponse(res);
}