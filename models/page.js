var mongoose = require('libs/mongoose');
var Schema = mongoose.Schema;

var schema = new Schema({
      key               :   { type: String, unique: true, index:true }
    , summary           :   { type: String }
    , status            :   { type: String }
    , reporter          :   { type: String }
    , originalEstimate  :   { type: String }
    , timeSpent         :   { type: String }
    , labels            :   { type: String }
    , assignee          :   { type: String }
    , blockers          :   { type: String }
    , progress          :   { type: String }
    , progressHistory   :   [{
        person          :   { type: String }
      , progressValue   :   { type: String }
      , dateChanged     :   { type: String }
    }]
    , created   :   { type: Date, default: Date.now() }
});

exports.Page = mongoose.model('Page', schema);