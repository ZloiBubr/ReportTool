/**
 * Created by Ilya_Kazlou1 on 2/4/2015.
 */

var mongoose = require('../libs/mongoose');

exports.getCloudApps = function (req, res) {

    var cloudApps = { cloudApps : [
        {leader: "Mike Breckle", cloudAppName: "Supplies", dueDate: "2015-01-10"},
        {leader: "Jon Demski", cloudAppName: "Supplies and Customers", dueDate: "2014-12-31"},
        {leader: "Mike Breckle", cloudAppName: "Receiving", dueDate: "2015-01-10"},
        {leader: "Mike Breckle", cloudAppName: "Receiving and Purchasing", dueDate: "2014-10-31"},
        {leader: "Jon Demski", cloudAppName: "Finalizing", dueDate: "2015-9-31"},
        {leader: "Jon Demski", cloudAppName: "Supplies", dueDate: "2015-01-10"}
    ]};

    res.json(cloudApps);
};

function getLeaderAcceptanceStatistics() {

}

