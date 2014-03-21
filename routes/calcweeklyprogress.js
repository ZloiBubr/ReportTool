/**
 * Created by Siarhei Hladkou (shladkou) on 3/7/14.
 */
var weeklydata = require('../middleware/weeklydata');

exports.get = function (req, res) {
    weeklydata.getData(req, res);
};