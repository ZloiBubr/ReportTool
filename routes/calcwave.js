/**
 * Created by Siarhei Hladkou (shladkou) on 3/7/14.
 */
var wavedata = require('../middleware/wavedata');

exports.get = function (req, res) {
    wavedata.getData(req, res);
};