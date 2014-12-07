var http = require('http');
var parse = require('querystring');
var url = require('url');



function checkUrl(request)
{
	var urlData=url.parse(request.url);

	if(urlData.path.indexOf('/api/latest.json?app_id=')>=0)
	{
		var queryData=parse.parse(urlData.query);


		if(queryData.app_id=='aec9d794c7104648b9264945b7a7f32c')
		{

			return true;
		}
	}


	return false;

}
http.createServer( function(request,response)
{
	if(checkUrl(request))
	{
    var data=JSON.stringify({
    "disclaimer": "Exchange rates provided by ",
    "license": "Data collected and blended ",
    "timestamp": new Date().getTime(),
    "base": "USD",
    "rates": {
        "AED": 3.672626,
        "AFN": 48.3775,
        "ALL": 110.223333,
        "AMD": 409.604993,
        /* 160 fx rates available - see currencies.json */
        "YER": 215.035559,
        "ZAR": 8.416205,
        "ZMK": 4954.411262,
        "ZWL": 322.355011
      }
    });
		response.writeHead(200,{"Content-Type":"application/json"});
		response.write(data);
		response.end();
	}
	else
	{
		response.writeHead(404,{"Content-Type":"application/json"});
		response.write(JSON.stringify({"Error":"Bad Url"}));
		response.end();
		console.log("Url check failed. Valid URL: http://localhost:18080/api/latest.json?app_id=aec9d794c7104648b9264945b7a7f32c");
	}
}).on('error', function(err)
{
	console.log("Mock Server Error: "+err);
}).listen(18080);
