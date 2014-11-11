var updateLabels = require('../middleware/updateLabels');

exports.post = function (req, res) {
    var username = req.body.username;
    var password = req.body.password;
    var jqlQuery = req.body.jqlquery;
    var labelsToAdd = req.body.labelstoadd;
    var labelsToDelete = req.body.labelstodelete;

    updateLabels.processItems(jqlQuery, labelsToAdd, labelsToDelete, username, password, function (err) {
        if (err) {
        }
    });
    res.send({});
};

exports.rememberResponse = function(res) {
    updateLabels.rememberResponse(res);
};