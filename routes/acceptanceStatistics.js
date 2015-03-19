var cloudAppData = require('../middleware/Range_Stat/cloudAppData');

exports.get = function (req, res) {
    cloudAppData.getCloudApps(req, res);
};
