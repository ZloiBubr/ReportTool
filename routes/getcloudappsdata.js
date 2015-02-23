/**
 * Created by Mikita_Stalpinski on 10/9/2014.
 */
var cloudAppsProgress = require("../middleware/cloudAppsProgress");

exports.get = function (req, res) {
    cloudAppsProgress.getData(req, res);
};