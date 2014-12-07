
const MONGO_DB_URL="mongodb://localhost:27017/Currency";


var mongoClient=require('mongodb').MongoClient;
var amqp=require('amqp');

var amqpConn=amqp.createConnection({host:"localhost"});

var mongoDb;

 mongoClient.connect(MONGO_DB_URL,function(err,db)
                   {
                     if(err) throw err;
                     mongoDb=db;
                   });


amqpConn.on('ready', function()
           {
            amqpConn.queue('currency_queue',{autoDelete: false},function(queue)
                {
                  console.log("Subscribed...");

                     queue.subscribe(function(msg)
                                 {
                                  writeToMongo(msg);
                                 });


                });
           });

function writeToMongo(msg)
{

                                   try
                                     {

                                    var id = msg["_id"];
                                    var base = msg["base"];
                                    var rates = msg["rates"];
                                   for(var key in rates)
                                     {
                                       mongoDb.collection(key,function(err,collection)
                                                         {
                                                           var doc={};
                                                           doc["timestamp"] = id;
                                                           doc["rateTo"+base] = rates[key];

                                                           collection.insert(doc,{safe:true}, function(err,result)
                                                                            {
                                                                              if(err) throw err;

                                                                            });

                                                         });
                                     }
                                     }
                                   catch(e)
                                     {
                                       console.log(e);
                                     }

}
