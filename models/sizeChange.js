/**
 * Created by Siarhei Hladkou (shladkou) on 3/10/15.
 */

var mongoose = require('../libs/mongoose');
var Schema = mongoose.Schema;

var schema = new Schema({
    date:                   { type: Date },
    key:                    { type: String },
    summary:                { type: String },
    from:                   { type: String },
    to:                     { type: String },
    person:                 { type: String }
});

exports.SizeChange = mongoose.model('SizeChange', schema);