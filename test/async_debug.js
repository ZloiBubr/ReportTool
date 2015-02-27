/**
 * Created by Gerd on 27.02.2015.
 */

var assert = require('assert');
var Q = require('q');

suite('asyncSuite', function(){
//    suite('AsyncSet',function(){
//        test("GetData method using callback for Async and Object as setterObj", function(done){
//            var count = 1000;
//            var resultCount = 0;
//            var promises = [];
//
//            for(var i=0;i<count;i++){
//                var fn = function(){
//                    var deferred = Q.defer();
//                    promises.push(deferred.promise)
//                    var iterration = i;
//                    return function(){
//                        console.log("log_call: " + iterration);
//                        deferred.resolve();
//                        resultCount++;
//                    }
//                };
//
//                setTimeout(fn(),1000);
//            };
//
//            Q.all(promises).then(function(){
//                console.log(resultCount);
//                done();
//            });
//        });

//        suite('AsyncSet',function(){
//            test("GetData method using callback for Async and Object as setterObj", function(done){
//
//                var fn1 = function(){
//                    console.log("fn1");
//                };
//
//                var fn2 = function(){
//                    var deffered = Q.defer();
//                    console.log("fn2 start");
//                    setTimeout(function(){
//                        console.log("fn2 finished");
//                        deffered.resolve();
//                    },1000);
//                    return deffered.promise;
//                };
//
//                var fn3 = function(){
//                    console.log("fn3");
//                };
//
//                var promise = new Q();
//                promise
//                    .then(fn1)
//                    .then(fn2)
//                    .then(fn3)
//                    .then(function(){
//                        console.log("END");
//                        setTimeout(function() {
//                            done();
//                        },500);
//                    })
//
//            });
//    })

    suite('AsyncSet',function(){
        test("GetData method using callback for Async and Object as setterObj", function(done){

            var fn1 = function(){
                var deffered = Q.defer();
                console.log("fn1");
                deffered.reject();
                return deffered.promise;
            };

            var fn2 = function(){
                var deffered = Q.defer();
                console.log("fn2 start");
                setTimeout(function(){
                    console.log("fn2 finished");
                    deffered.reject();
                },1000);
                return deffered.promise;
            };

            var fn3 = function(){
                console.log("fn3");
            };

            var promise = new Q();
            promise
                .then(fn1)
                .then(fn2)
                .fail(function(){
                    console.log("Error1");
                    setTimeout(function() {
                        done();
                    },500);
                })
                .done(function(){
                    console.log("END");
                    setTimeout(function() {
                        done();
                    },500);
                });
                //.then(fn3)
                //.then()

        });
    })

})