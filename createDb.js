/**
 * Created by Siarhei Hladkou (shladkou) on 3/6/14.
 */
var mongoose = require('./libs/mongoose');
var async = require('async');

exports.Clear = function (callback) {
    async.series([
        open,
        dropDatabase,
        requireModels
    ], function(err) {
        callback(err);
//    mongoose.disconnect();
//    process.exit(err ? 255 : 0);
    });
}

function open(callback) {
    mongoose.connection.on('open', callback);
}

function dropDatabase(callback) {
    var db = mongoose.connection.db;
    db.dropDatabase(callback);
}

function requireModels(callback) {
    require('models/module');
    require('models/page');

    async.each(Object.keys(mongoose.models), function(modelName, callback) {
        mongoose.models[modelName].ensureIndexes(callback);
    }, callback);
}
