/**
 * Created by Siarhei Hladkou (shladkou) on 3/5/14.
 */
var mongoose = require('libs/mongoose');
var Schema = mongoose.Schema;

var schema = new Schema({
    key: {
        type: String,
        unique: true,
        required: true
    },
    summary: {
        type: String,
        required: true
    },
    created: {
        type: Date,
        default: Date.now()
    }
});

exports.Module = mongoose.model('Module', schema);