/*
 *Normalise in parallel
 */

const MONGO_DB_URL="mongodb://localhost:27017/Currency";

var mongoClient=require('mongodb').MongoClient;

var currency = process.argv[2];
var mongo_db_url = process.argv[3];
var agg_coll = process.argv[4];
var dataDocId = process.argv[5];


var normCollName = "NORM_"+currency;
var statsDocId = "STATS_"+currency;

var signature = "Normalising base: "+currency+" from:"+mongo_db_url+"/"+agg_coll+"    Data doc Id:"+dataDocId;
console.log(signature);

normalise(mongo_db_url);
function normalise(mongo_db_url)
{
    if(mongo_db_url==null)
      {
        mongo_db_url=MONGO_DB_URL;
        console.log("Using default DB URL.");
      }
    
    mongoClient.connect(mongo_db_url, function(err,db)
			{
			  if(err) 
			  {
                            console.log(signature+" > Error getting db connection: "+err);
			  }
			  db.collection(agg_coll, function(err,agg)
						  {
						    if (err) {
						     console.log(signature+" > Error getting Aggregation Collection: "+err);
						    }
						    
						    
						      
						    
						    
						    var stream = agg.find({_id:statsDocId}).stream(); 
						    
						    var aggData = {};
						    stream.on('data', function(data)
							      {
								aggData[data._base] = data;
							      });
						    
						    stream.on('end',function()
								    {
								    //Begin processing
								   
									  
									
									
									  
									db.collection(currency, function(err,data_coll)
										      {
											var baseAggData = aggData[currency];
											var localBase = currency;
											var normDataSet = [];
											
											var baseStr = null;
											if(dataDocId!=null && dataDocId!="null")
											{
											    console.log("Max unchanged for: "+currency+ " using latest document id: "+dataDocId);
											    baseStr = data_coll.find({_id:dataDocId*1}).stream();
											}
											else
											{
											    db.collection(normCollName, function(err,coll)
											    {
												process.send({text: "Dropped:..."+normCollName});
											      coll.drop();
											    });
											    baseStr = data_coll.find().stream();
											}
											baseStr.on('data',function(data)
												   {
												     var normData = {};
												     normData._id = data._id;
												  
												     for(var to in data)
												     {
												      if (baseAggData[to]!=null && to!="_id") {
												       
													
													normData[to.toString()] = (data[to]/baseAggData[to].max);
												     
												      }
												     }
												     
												     normDataSet.push(normData);
												   });
											baseStr.on('end',function()
												   {
												      db.collection(normCollName, function(err,coll)
														    {
														      console.log(normCollName+" Size: "+normDataSet.length);
														      if (normDataSet.length == 0) {
															console.log("No normalized data exists for writing. "+currency);
														      }
														      else
														      {
															coll.insert(normDataSet, {safe:false},function(err,result)
																    {
																      if (err) {
																	console.log("Error on "+normCollName+": "+err);
																      }
																      else{
																      	process.send({text: "Done: "+normCollName});


																      }
																      db.close();
																      });
														      }
														    });
												   });
										      });
									
									  
									
								      
								    
								    });
						  }
						  );
			 
			
			});
};