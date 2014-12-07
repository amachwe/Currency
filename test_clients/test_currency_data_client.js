var amqp=require("amqp");

var amqpClient=amqp.createConnection({host:"localhost"});

amqpClient.on('ready', function()
              {
                 var exchange = amqpConnection.exchange("currency_queue",{type:"topic"},function(x)
                                                       {
                                                         x.subscribe(function(msg)
                                                         {
                                                            console.log(msg);
                                                         });
                                                       });

              }
             );
