if (!!window.EventSource) {
    var source = new EventSource('/update_progress');
    source.addEventListener('progress', function(e) {
        var percentage = e.data;
        //update progress bar in client
        $("#progress .bar").css({ width: percentage + '%' });
        if(percentage == '100') {
            window.location.href = "/";
        }
    }, false);
    source.addEventListener('logmessage', function(e) {
        var text = e.data;
        $("#serverlog").prepend(text + "<br/>");
    }, false);
    source.addEventListener('error', function(e) {
        source.close();
    }, false);
}
