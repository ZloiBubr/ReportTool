/**
 * Created by Siarhei Hladkou (shladkou) on 2/26/14.
 */
var nconf = require('nconf');
var path = require('path');


nconf.argv()
    .env()
    .file({ file: path.join(__dirname, 'config.json') });

module.exports = nconf;