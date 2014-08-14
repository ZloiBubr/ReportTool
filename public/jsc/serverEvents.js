if (!!window.EventSource) {
    var source = new EventSource('/update_progress');
    source.addEventListener('progress', function(e) {
        var data = JSON.parse(e.data);
        if(data.page)
        {
            $("#page_progress .bar").css({ width: data.page + '%' });
        }
        else{
            $("#issue_progress .bar").css({ width: data.issues + '%' });
        }

        //update progress bar in client

//        if(percentage == '100') {
//            window.location.href = "/";
//        }
    }, false);
    source.addEventListener('logmessage', function(e) {
        $("#cleanbtn").button("loading");
        $("#updatebtn").button("loading");
        var text = e.data;
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
