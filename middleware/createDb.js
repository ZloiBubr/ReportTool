/**
 * Created by Siarhei Hladkou (shladkou) on 3/6/14.
 */
var mongoose = require('./../libs/mongoose');

exports.Clear = function (res, callback) {
    var db = mongoose.connection.db;
    db.dropDatabase(function (err) {
        callback(err, res);
    });
    callback(null, res);
};
