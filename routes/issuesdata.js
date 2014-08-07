/**
 * Created by user on 8/7/2014.
 */

var issuesData = require('../middleware/issuesData');

exports.get = function (req, res) {
    issuesData.getData(req, res);
};