/**
 * Created by Siarhei Hladkou (shladkou) on 3/7/14.
 */
var velocitydata = require('../middleware/velocitydata');

exports.get = function (req, res) {
    velocitydata.getData(req, res);
};