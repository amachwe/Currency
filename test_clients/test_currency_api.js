var http = require('http');

http.request(
  {
    host:'localhost',
    port:3999,
    method:'GET',
    path: '/currency/sequence/USD'

  },
  function(response)
  {
    response.on('readable', function()
               {

                 response.setEncoding("utf-8");
                 console.log(response.read());

               });
  }).end();
