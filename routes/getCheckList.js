var checkListData = require('../middleware/Range_Stat/checkListData');

exports.get = function (req, res) {
    checkListData.getChecklists(req, res);
};