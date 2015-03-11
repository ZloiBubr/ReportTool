var responses = [];

exports.setResponseObj = function(type, req, res) {
    var session = req.session;
    if(!session) {
        return;
    }
    if(session.stamp) {
        for(var i=0; i<responses.length; i++) {
            if(responses[i].session == session.stamp) {
                responses[i].response = res;
                return;
            }
        }
    }
    session.stamp = Date.now();
    responses.push({type: type, session: session.stamp, response: res});
};

exports.notifySubscribers = function(type, event, data) {
    for(var i=0; i<responses.length; i++) {
        if(Date.now() - responses[i].session > 6*60*60*1000) { //session TTL 6*60 min
            responses.splice(i, 1);
            continue;
        }
        if(responses[i].type == type && responses[i].response) {
            responses[i].response.write("event: " + event + "\n");
            responses[i].response.write('data: ' + data + '\n\n');
        }
    }
}