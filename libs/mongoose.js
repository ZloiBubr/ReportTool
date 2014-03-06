/**
 * Created by Siarhei Hladkou (shladkou) on 3/5/14.
 */
var mongoose = require('mongoose');
var config = require('config');
var log = require('../libs/log');

mongoose.connect(config.get('mongoose:uri'), config.get('mongoose:options'));

module.exports = mongoose;

// Error handler
mongoose.connection.on('error', function (err) {
    log.error(err)
})
