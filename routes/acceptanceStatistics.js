var cloudAppData = require('../middleware/cloudAppData');

exports.get = function (req, res) {
    cloudAppData.getCloudApps(req, res);
};
