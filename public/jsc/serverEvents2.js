if (!!window.EventSource) {
    var source = new EventSource('/update_labels');
    source.addEventListener('logmessage', function(e) {
        var text = e.data;
        if(text == "**** Update Finished ****") {
            $("#updatebtn").button("reset");
        }
        else {
            $("#updatebtn").button("loading");
        }
        $("#serverlog").prepend(text + "<br/>");
    }, false);
    source.addEventListener('errmessage', function(e) {
        var text = e.data;
        $("#errorlog").prepend(text + "<br/>");
    }, false);
    source.addEventListener('error', function(e) {
        source.close();
    }, false);
}
