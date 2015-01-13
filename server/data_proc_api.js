var ws = require("ws").Server;

var PORT = process.env.PORT || 8080;
var serv = new ws({port:PORT});

var fork = require("child_process").fork;
var spawn = require("child_process").spawn;
var aggregation_running = false;

var socket = null;
const WORKER_COUNT = 4;
serv.on('connection', function(sock)
        {
         socket = sock;
         console.log("Running Socket Server: "+PORT);
         socket.on('message', messageCallback);
         
        });


function messageCallback(message)
{
   
   try {
          if (aggregation_running) {
            socket.send((new Date())+" > Aggregation already running.");
          }
          else
          {
            aggregation_running = true;
            var data = JSON.parse(message);
            var baseList = data.baseList;
            var target = data.target;
            var source = data.source;
            var normalise = data.normalise !=null ? true:false;
            var docId = data.docid !=null ? data.docid : 0;
            
            if (docId == 0) {
               console.log("Running resync aggregation.");
            }
            else
            {
               console.log("Running delta aggregation.");
            }
            
            socket.send("ACCEPTED");
            console.log((new Date())+"  Base List: "+baseList+"\nTarget: "+target+"\nSource: "+source+"\nNormalise: "+normalise+"\nDoc Id: "+docId);
            
            if (baseList!=null && target !=null && source !=null) {
            
         
      
           
               var currCount = baseList.length;
               var batchSize = currCount*1/WORKER_COUNT;
              console.log("Workers: "+WORKER_COUNT+"  Batch Size: "+batchSize);
              
               
                  //Prepare batches
                  var batch= [];
                  var batchCount=0;
                  for(var i=0;i<baseList.length;i++)
                  {
                    batch.push(baseList[i]);
                    if (batch.length>=batchSize || i == baseList.length-1) {
                     
                     batchCount++;
                     
                     
                     
                     var cp = fork("./aggregate.js",[JSON.stringify(batch),normalise,source,target,batchCount,docId]);
                     cp.on('message',function(msg)
                                    {
                                       console.log(cp.pid+" - "+msg.text);
                                    }).on('error', function(error)
                                                   {
                                                      console.log(cp.pid+ " -  Error: "+error);
                                                      socket.send("ERROR");
                                                   }).on('exit',function(code)
                                                               {
                                                                             
                                                                  console.log("Aggregation completed "+batchCount);
                                                                  batchCount--;
                                                                  if (batchCount == 0 ) {
                                                                        console.log("All done.");
                                                                        socket.send("FINISHED");
                                                                        aggregation_running = false;
                                                                        
                                                                  }
                                                                  
                                                                 
                                                               });
                     batch = [];
                     
                    }
                    
                
                  }
            
            
            }
            else
            {
              var mBadReq = "Bad request, missing base currency list, source or target database.";
              socket.send(mBadReq);
              console.log(mBadReq);
            }
          }
      } catch(e) {
         console.log("Error cannot aggregate: "+e);
     
        
      }
   
         
         
          
}