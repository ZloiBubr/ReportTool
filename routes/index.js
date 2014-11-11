module.exports = function(app) {

    app.get('/', function(req, res) {
        res.render('index');
    });
    app.get('/progress', function(req, res) {
        res.render('progress');
    });
    app.get('/weekly', function(req, res) {
        res.render('weekly');
    });
    app.get('/pagebysize', function(req, res) {
       res.render('pagebysize');
    });
    app.get('/updatejira', function(req, res) {
        req.socket.setTimeout(1000 * 60 * 10);
        res.render('updatejira');
    });
    app.get('/updatelabels', function(req, res) {
        req.socket.setTimeout(1000 * 60 * 10);
        res.render('updatelabels');
    });
    app.get('/getpagedata', function(req, res) {
        res.render('page');
    });

   /* app.get('/issues/getAll', function(req, res) {
        res.render('issuesdata');
    });*/
};