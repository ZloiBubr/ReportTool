/**
 * Created by Siarhei Hladkou (shladkou) on 3/5/14.
 */
var mongoose = require('../libs/mongoose');
var Schema = mongoose.Schema;

var schema = new Schema({
    key:        { type: String, unique: true, index: true },
    summary:    { type: String },
    created:    { type: Date, default: Date.now() },
    duedate:    { type: Date },
    assignee:   { type: String },
    status:     { type: String },
    labels:     { type: String },
    resolution: { type: String },
    priorityName:   { type: String },
    priorityIconUrl:   { type: String }
});

exports.Module = mongoose.model('Module', schema);