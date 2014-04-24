var personaldata = require('../middleware/personalprogress');

exports.get = function (req, res) {
    personaldata.getData(req, res);
};