module.exports = function(app) {

    app.get('/', function(req, res) {
        res.render('cumulative');
    });
    app.get('/progress', function(req, res) {
        res.render('progress');
    });
    app.get('/weekly', function(req, res) {
        res.render('weekly');
    });
    app.get('/updatejira', function(req, res) {
        req.socket.setTimeout(1000 * 60 * 10);
        res.render('updatejira');
    });
};