/**
MongoDB Raw data to AMQP
*/


const MONGO_DB_URL="mongodb://localhost:27017/Currency";
const MONGO_COLL_RAW="Raw";

var mongoClient=require('mongodb').MongoClient;
var amqp=require('amqp');

var amqpConn = amqp.createConnection({host:"localhost"});

mongoClient.connect(MONGO_DB_URL, function(err,db)
                   {
                     if(err)throw err;

                     db.collection(MONGO_COLL_RAW,function(err,coll)
                                  {
                                    var stream=coll.find().stream();
                                    stream.on('data',function(item)
                                             {
                                               amqpConn.publish('currency_queue',item);

                                             }).on('end',function()
                                                  {
                                                    console.log("Done Stream.");
                                                  });
                                  });
                   });

