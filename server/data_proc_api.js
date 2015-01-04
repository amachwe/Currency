var express = require("express");
var combine = require('currencycombine');

var app = express();

const MONGO_DB_URL="mongodb://localhost:27017/Currency";
var PORT = 4000;

app.get("/currency/sequence", function(req, res)
         {
            var doc = req.body.doc;
            console.log("Delta Request: "+doc);
         });


app.get("/currency/sequence/bulk", function(req,res)
         {
            console.log("Bulk Request...");
            combine.process(MONGO_DB_URL,null,null);
            res.write("Bulk processing started.");
            res.end();
         });


app.listen(PORT);

console.log("Data processor server listening on: "+PORT);