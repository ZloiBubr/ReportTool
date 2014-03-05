/**
 * Created by Siarhei Hladkou (shladkou) on 2/27/14.
 */

var jiraProvider = require('../middleware/jiraProvider');

exports.get = function(req, res){
    res.render('updatejira');
};

exports.post = function(req, res, next) {
    var username = req.body.username;
    var password = req.body.password;

    jiraProvider.updateJiraInfo(username, password);

    res.send({});
};