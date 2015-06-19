var nodemailer = require("nodemailer");

// create reusable transport method (opens pool of SMTP connections)
var smtpTransport = nodemailer.createTransport({
    service: "Gmail",
    auth: {
        user: "reporttool.server@gmail.com",
        pass: "201420152016"
    }
});

// setup e-mail data with unicode symbols
var mailOptions = {
    from: "Report Tool ✔ <reporttool.server@gmail.com>", // sender address
    to: "siarhei_hladkou@epam.com", // list of receivers
    //to: "", // list of receivers
    subject: "Uncaught Error on server ✔", // Subject line
    text: "Error Happened ✔", // plaintext body
    html: "<b>Error Happened ✔</b>" // html body
};

exports.sendMail = function(message, log) {
    mailOptions.text = message + "/n" + log;
    mailOptions.html = "<h2>" + message + "</h2><span>" + log + "</span>";

    smtpTransport.sendMail(mailOptions, function(error, response){
        if(error){
            console.log(error);
        }else{
            console.log("Message sent: " + response.message);
        }

        // if you don't want to use this transport object anymore, uncomment following line
        //smtpTransport.close(); // shut down the connection pool, no more messages
    });
};