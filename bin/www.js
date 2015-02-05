#!/usr/bin/env node
var debug = require('debug')('express4');
var app = require('../app');
var config = require('../config');
var log = require('../libs/log')(module);

app.set('port', config.get('port') || process.env.PORT || 3000);

var server = app.listen(app.get('port'), function() {
    log.info('Express server listening on port ' + server.address().port);
});

process.on
(
    'uncaughtException',
    function (err)
    {
        var log = err.stack;


        // print note to console
        console.log("SERVER CRASHED!");
        console.log(log);

        // email log to developer
        console.log("EMAILING ERROR");
        var mailer = require('../libs/mailer');
        mailer.sendMail( process.env.COMPUTERNAME + "_" + process.env.USERNAME + " > NODE SERVER CRASHED:", log);

        // If we exit straight away, the write log and send email operations wont have time to run
        setTimeout
        (
            function()
            {

                // uncomment these lines to close the process instead of re-starting
                //console.log("KILLING PROCESS");
                //process.exit();

                // re-start the server
                console.log("SERVER RESTARTING...");
//                startServer(); // This function starts the server
            },
            10000
        );
    }
);
