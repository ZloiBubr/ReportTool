/**
 * Created by Siarhei Hladkou (shladkou) on 3/7/14.
 */
var normalized = require('../middleware/normalized');

exports.get = function (req, res) {
    normalized.getData(req, res);
};