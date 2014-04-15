var mongoose = require('../libs/mongoose');
var Schema = mongoose.Schema;

var schema = new Schema({
    key:                    { type: String, unique: true, index: true },
    uri:                    { type: String },
    summary:                { type: String },
    status:                 { type: String },
    reporter:               { type: String },
    originalEstimate:       { type: String },
    timeSpent:              { type: String },
    labels:                 { type: String },
    assignee:               { type: String },
    blockers:               { type: String },
    progress:               { type: String },
    storyPoints:            { type: String },
    devFinished:            { type: String },
    qaFinished:             { type: String },
    progressHistory: [{
            person:         { type: String },
            progressFrom:   { type: String },
            progressTo:     { type: String },
            dateChanged:    { type: String }
        }],
    epicKey:                { type: String },
    worklogHistory: [{
            person:         { type: String },
            timeSpent:      { type: String },
            dateChanged:    { type: String },
            dateStarted:    { type: String }
        }],
    created:                { type: String },
    updated:                { type: String }
});

exports.Page = mongoose.model('Page', schema);