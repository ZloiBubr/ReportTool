/**
 * Created by Siarhei Hladkou (shladkou) on 7/31/14.
 */
var moduledata = require('../middleware/moduledata');

exports.get = function (req, res) {
    moduledata.getData(req, res);
};