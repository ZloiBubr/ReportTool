/**
 * Created by Siarhei Hladkou (shladkou) on 3/7/14.
 */
var progressdata = require('../middleware/progressdata');

exports.get = function(req, res){
    progressdata.getData(req,res);
};