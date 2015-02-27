/**
 * Created by Gerd on 27.02.2015.
 */

var assert = require('assert');
var Q = require('q');

suite('asyncSuite', function(){
    suite('AsyncSet',function(){
        test("GetData method using callback for Async and Object as setterObj", function(done){
            var count = 1000;
            var resultCount = 0;
            var promises = [];

            for(var i=0;i<count;i++){
                var fn = function(){
                    var deferred = Q.defer();
                    promises.push(deferred.promise)
                    var iterration = i;
                    return function(){
                        console.log("log_call: " + iterration);
                        deferred.resolve();
                        resultCount++;
                    }
                };

                setTimeout(fn(),1000);
            };

            Q.all(promises).then(function(){
                console.log(resultCount);
                done();
            });


//            assert.strictEqual(node_cache_instance.getData(key, value, function(result){return_obj = result;}), value);
//            assert.strictEqual(value, return_obj);

        });

    })

})