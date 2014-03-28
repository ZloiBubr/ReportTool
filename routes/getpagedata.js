/**
 * Created by Siarhei Hladkou (shladkou) on 3/7/14.
 */
var pagedata = require('../middleware/pagedata');

exports.get = function (req, res) {
    pagedata.getData(req, res);
};