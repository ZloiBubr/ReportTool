var mongoose = require('../libs/mongoose');
var Schema = mongoose.Schema;

var schema = new Schema({
    key:                    { type: String, unique: true, index: true },
    issuetype:              { type: String, index: true },
    object:                 { type: Object }
});

exports.Issue = mongoose.model('OriginalJiraIssue', schema);