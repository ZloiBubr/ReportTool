/**
 * Created by Heorhi_Vilkitski on 2/4/2015.
 */

var mongoose = require('../libs/mongoose');
var Schema = mongoose.Schema;

var schema = new Schema({
    key:                    { type: String, unique: true, index: true },
    uri:                    { type: String },
    summary:                { type: String },
    type:                   { type: String },
    status:                 { type: String },

    resolution:             { type: String },
    reporter:               { type: String },
  //  originalEstimate:       { type: String },
    timeSpent:              { type: String },
    labels:                 { type: String },
    assignee:               { type: String },

//    blockers:               { type: String },
//    progress:               { type: String },

    created:                { type: String },
    updated:                { type: String },

    dev_complete:           { type: String },
    qa_complete:            { type: String },
    sme_complete:           { type: String },
    plex_complete:          { type: String },
    duedate:                { type: String },

    epicKey: {type: String},

    _parentPage:{ type: Schema.Types.ObjectId, ref: 'Page'},
    _epic:{ type: Schema.Types.ObjectId, ref: 'Module'}
});

exports.CloudApp = mongoose.model('CloudApp', schema);