/**
 * Created by user on 8/7/2014.
 */

var issuesDataProvider = require('../middleware/issuesDataProvider');

exports.get = function (req, res) {
    issuesDataProvider.getData(req, res);
};