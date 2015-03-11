var mongoose = require('../libs/mongoose');
var Schema = mongoose.Schema;

var schema = new Schema({
    numerical:  { type: Number, unique: true, index: true },
    name:       { type: String },
    started:    { type: Date, default: Date.now() },
    updated:    { type: Date, default: Date.now() }
});

exports.Version = mongoose.model('Version', schema);