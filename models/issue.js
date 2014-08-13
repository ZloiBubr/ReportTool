/**
 * Created by Heorhi_Vilkitski on 7/29/2014.
 */

var mongoose = require('../libs/mongoose');
var Schema = mongoose.Schema;

var schema = new Schema({
    key:                    { type: String, unique: true, index: true },
    uri:                    { type: String },
    summary:                { type: String },
    type:                   { type: String },

    pages:[{
        linkType: {type: String},
        page: {type: Schema.Types.ObjectId, ref: 'Page'}
    }],

    status:                 { type: String },

    resolution:             { type: String },
    reporter:               { type: String },
    originalEstimate:       { type: String },
    timeSpent:              { type: String },
    labels:                 { type: String },
    assignee:               { type: String },

    blockers:               { type: String },
    progress:               { type: String },

    created:                { type: String },
    updated:                { type: String }
});

exports.Issue = mongoose.model('Issue', schema);