const MONGO_DB_URL="mongodb://localhost:27017/Currency";

var mongoDbUrl = MONGO_DB_URL;

var combine = require('currencycombine');

if(process.argv.length>2)
{
    mongoDbUrl = process.argv[2];
}

console.log("DB URL: "+mongoDbUrl);
    
 
 
console.log("Bulk Resync started..");

combine.process(mongoDbUrl,null,null);
            
