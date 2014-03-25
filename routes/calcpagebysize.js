/**
 * Created by Siarhei Hladkou (shladkou) on 3/7/14.
 */
var pagebysize = require('../middleware/pagebysize');

exports.get = function (req, res) {
    pagebysize.getData(req, res);
};