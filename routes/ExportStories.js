/**
 * Created by Heorhi_Vilkitski on 4/3/2015.
 */
var exportStories = require('../middleware/exportStories');

exports.get = function (req, res) {
    exportStories.getData(req, res);
};