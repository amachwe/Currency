var express = require('express');
var combine = require('currencycombine');


var app = express();

const PORT=3999;
/*
Help
*/
app.get("/", function(request,response)
       {
         response.header("Access-Control-Allow-Origin", "*");
         response.header("Access-Control-Allow-Headers", "X-Requested-With");
         
         response.sendFile(
           'help.htm', {root: __dirname}
         );
       });
/*
Full currency list
*/
app.get("/currency/list", function(request,response)
       {
         response.header("Access-Control-Allow-Origin", "*");
         response.header("Access-Control-Allow-Headers", "X-Requested-With");
         
         response.send(combine.getCurrencyList());
       });

/*
Sequence Stream
*/
app.get("/currency/sequence/:code", function(request,response)
       {
         response.header("Access-Control-Allow-Origin", "*");
         response.header("Access-Control-Allow-Headers", "X-Requested-With");
         
         getCurrencyStream(request.params.code, response);

       });

app.listen(PORT);
console.log("Currency API Active on port: "+PORT);

/*
Implementation
*/
var mongoClient= require('mongodb').MongoClient;
var Stream = require('stream');
var JSONStream = require('JSONStream');

const currency_list = combine.getCurrencyList();
const MONGO_DB_URL="mongodb://localhost:27017/Currency";

function getCurrencyStream(code,response)
  {

      if(currency_list[code]!=null)
       {
         mongoClient.connect(MONGO_DB_URL, function(err,db)
                       {
                         if(err) throw err;


                             db.collection(code, function(err,coll)
                                      {
                                        if(err) throw err;
                                        response.set('Content-Type', 'application/json');

                                        coll.find().stream().pipe(JSONStream.stringify()).pipe(response);

                                      });


                       });
        }
       else
        {

           response.send("Currency code not found: "+code+"");

        }
  }
