var mongoose = require('../libs/mongoose');
var Schema = mongoose.Schema;

var schema = new Schema({
    key:                    { type: String, unique: true, index: true },
    automationType:         { type: Boolean, default: false },
    epicKey:                { type: String, index: true },
    uri:                    { type: String },
    summary:                { type: String },
    status:                 { type: String },
    resolution:             { type: String },
    reporter:               { type: String },
    labels:                 { type: String },
    acceptanceLabels:       { type: String },
    assignee:               { type: String },
    blockers:               { type: String },
    progress:               { type: String },
    testingProgress:        { type: String },
    checklistCreated:       { type: Boolean },
    storyPoints:            { type: String },
    devFinished:            { type: String },
    qaFinished:             { type: String },
    smeFinished:            { type: String },
    progressHistory: [{
            person:         { type: String },
            progressFrom:   { type: String },
            progressTo:     { type: String },
            dateChanged:    { type: Date }
        }],
    worklogHistory: [{
            person:         { type: String },
            timeSpent:      { type: String },
            dateChanged:    { type: Date },
            dateStarted:    { type: Date }
        }],
    issues: [{
            inward: {type: String},
            issue: {type: Schema.Types.ObjectId, ref: 'Issue'}
    }],
    created:                { type: String },
    updated:                { type: String },
    acceptanceStatus:       { type: String },
    acceptanceKey:          { type: String },
    acceptanceAssignee:     { type: String },
    devfinish:              { type: Date},
    qafinish:               { type: Date},
    accfinish:              { type: Date},
    cusfinish:              { type: Date},
    pmhfinish:              { type: Date},
    lafinish:               { type: Date}
});

exports.Page = mongoose.model('Page', schema);