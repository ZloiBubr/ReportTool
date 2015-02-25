if (!!window.EventSource) {
    var source = new EventSource('/update_progress');
    source.addEventListener('progress', function(e) {
        var data = JSON.parse(e.data);
        if(data.page)
        {
            $("#page_progress_bar").css({ width: data.page + '%' });
        }
        else{
            $("#issue_progress_bar").css({ width: data.issues + '%' });
        }
    }, false);
    source.addEventListener('logmessage', function(e) {
        var text = e.data;
        if(text == "**** Update Finished ****") {
            $("#updatebtn").button("reset");
            $("#cleanbtn").button("reset");
        }
        else {
            $("#cleanbtn").button("loading");
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
