/**
 * Created by Heorhi_Vilkitski on 7/29/2014.
 */

var mongoose = require('../libs/mongoose');
var Schema = mongoose.Schema;

var schema = new Schema({
    key:                    { type: String, unique: true, index: true },
    uri:                    { type: String },
    summary:                { type: String },

    pages:[{
        inward: {type: String},
        page: {type: Schema.Types.ObjectId, ref: 'Page'}
    }]

//    status:                 { type: String },
//
//    resolution:             { type: String },
//    reporter:               { type: String },
//    originalEstimate:       { type: String },
//    timeSpent:              { type: String },
//    labels:                 { type: String },
//    assignee:               { type: String },
//
//    blockers:               { type: String },
//    progress:               { type: String },
//
//    storyPoints:            { type: String },
//    devFinished:            { type: String },
//
//    qaFinished:             { type: String },
//    progressHistory: [{
//        person:         { type: String },
//        progressFrom:   { type: String },
//        progressTo:     { type: String },
//        dateChanged:    { type: Date }
//    }],
//    epicKey:                { type: String },
//    worklogHistory: [{
//        person:         { type: String },
//        timeSpent:      { type: String },
//        dateChanged:    { type: Date },
//        dateStarted:    { type: Date }
//    }],
//    created:                { type: String },
//    updated:                { type: String }
});

exports.issue = mongoose.model('Issue', schema);