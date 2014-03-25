/**
 * Created by Siarhei Hladkou (shladkou) on 3/6/14.
 */
var mongoose = require('./../libs/mongoose');

exports.Clear = function (full, callback) {
    if(full) {
        var db = mongoose.connection.db;
        db.dropDatabase(function (err) {
            callback(err);
        })
    }
    else {
        callback();
    }
}
