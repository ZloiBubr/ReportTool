var result = db.pages.find({
        worklogHistory: {
            $elemMatch: {
                person: "Ilya Kazlou1",
                //dateStarted:
                dateChanged: {
                    $gte: new ISODate("2014-05-11T00:00:00.000Z")//,
                    //$lt: new ISODate("2014-05-25T00:00:00.000Z")
                }
            }
        }
    }).pretty();

while (result.hasNext()){
    printjson(result.next());
}