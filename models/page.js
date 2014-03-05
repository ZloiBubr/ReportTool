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

exports.Page = mongoose.model('Page', schema);