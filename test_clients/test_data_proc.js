var ws = require("ws");

var SERVER = "mongodb://localhost:27017";
var DB = "Currency";
var AGG_DB = "CurrencyAggregate";
var norm = true;
var currencyList = require("currencycombine").getCurrencyCodeList();


var request =
{
    
    source: SERVER+"/"+DB,
    target: SERVER+"/"+AGG_DB,
    baseList: currencyList,//{"USD":1,"GBP":2,"INR":3,"AED":4,"CAD":5,"EUR":6,"JPY":7,"NGN":8},
    normalise: true
}





console.log("Sending request...  ");
var socket = new ws("ws://localhost:8080");
socket.on('open',function()
          {
            socket.send(JSON.stringify(request));
            
          });

var count = 0;
const REPEATS = 20;
socket.on('message', function(message)
          {
            console.log(message);
            if (message == "FINISHED") {
                if (count<REPEATS && message!="ERROR") {
                    
                
                    console.log("Repeat Number: "+(count++));
                    
                    setTimeout(function()
                               {
                                console.log("Sending..");
                                socket.send(JSON.stringify(request));
                               }, 100);
                    
                }
                else
                {
                    
                    if (message=="ERROR") {
                       console.log("Test complete with ERRORs."); 
                    }
                    else
                    {
                        console.log("Test complete.");
                    }
                    process.exit();
                }
            }
          });