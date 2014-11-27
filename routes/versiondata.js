var versiondatadata = require('../middleware/versiondata');

exports.get = function (req, res) {
    versiondatadata.getData(req, res);
};