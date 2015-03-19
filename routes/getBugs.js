var bugListData = require('../middleware/Range_Stat/bugListData');

exports.get = function (req, res) {
    bugListData.getBugs(req, res);
};
