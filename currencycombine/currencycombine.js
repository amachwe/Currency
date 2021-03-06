/**
 (c) Azahar Machwe 2014
*/

/**
MongoDB Raw to processed collection with rates across other currencies
*/

const MONGO_DB_URL="mongodb://localhost:27017/Currency";
const MONGO_COLL_RAW="Raw";
const MONGO_COLL_AGG="Aggregates";

var mongoClient=require('mongodb').MongoClient;
var fork = require("child_process").fork;


/*
Functions
*/

/*
Clear all currency data

db - database object
*/
function clearAllCurrencies(db)
{
  for(var key in currency_list)
    {
      console.log("Clearing: "+key);
      db.collection(key).remove(function(err,result)
      {
         if(err) throw err;

      });

    }
}

/*
Write Currency data to database

msg - response from currency service (openexchangerates.org)
db - database object
*/
function writeToMongo(msg, db,bulkMode)
{
  try
  {
    
     var id = msg["_id"];
     var base = msg["base"];
     var rates = msg["rates"];
     var docColl = {};
     for(var from in rates)
     {
        var doc={};
        doc["_id"] = id;
        doc[base] = rates[from];
	

        /*
        Get the currency conversion to all other currencies.
        */
        for(var to in rates)
        {
            doc[to] = doc[base]/rates[to];
        }
	
	docColl[from] = doc;
	
        db.collection(from,function(err,collection)
        {
	    
	   
	   ;
           collection.insert(doc,{safe:true}, function(err,result)
           {
	      
              if(err) throw err;
	      
	      
           });

        });
      }

      if (bulkMode != null && bulkMode == false) {
	var wipList = [];
	console.log("Delta mode - stats processing");
	for(var from in docColl)
	{
		
		 wipList.push(from);
		//Delta Update Stats
		db.collection(MONGO_COLL_AGG,function(err,collection)
			      {
				var currName = from;
				var statsCurrName = "STATS_"+from;
				var currDoc = docColl[from];
				var maxChanged = false;
				
				
				console.log("Processing: "+statsCurrName);
				var stream = collection.find({_id:statsCurrName}).stream();
				stream.on('data',function(item)
					  {
					    
					      
					    if (item!=null) {
					     
					      for(var to in currDoc)
					      {
						
						//Update statistics
						if (to!="_id" && to!=from) {
						  var statsDoc = item[to];
						  
						  var toVal = currDoc[to];
						  
						  statsDoc.count = statsDoc.count+1;
						  statsDoc.sum = statsDoc.sum + toVal;
						  statsDoc.avg = statsDoc.sum/statsDoc.count;
						  
						  if (toVal > statsDoc.max) {
						    statsDoc.max = toVal;
						    maxChanged=true;
						  }
						  if (toVal < statsDoc.min) {
						    statsDoc.min = toVal;
						  }
						  
						  item[to] = statsDoc;
						}
					      }
					      
					      collection.update({_id:statsCurrName},item,function(err, result)
								{
								  if (err) {
								    throw err;
								  }
								});
					    }
					    
					  }).on('end',function()
						{
						  console.log("..done. "+statsCurrName+ " Max Changed: "+maxChanged +" Normalising now.." );
						  var currDocId = null;
						  if (maxChanged!=true) {
						    currDocId = currDoc._id;
						  }
						  //FORK - setup child monitoring
						  var cp = fork("./normalise.js",[currName,MONGO_DB_URL,MONGO_COLL_AGG,currDocId]);
						  
						  
						  cp.on('message',function(msg)
							{
							  console.log(cp.pid+" - "+msg.text);
							}).on('error', function(error)
							      {
								console.log(cp.pid+ " - "+currName+" Error: "+error);
							      }).on('exit',function()
								    {
								      wipList.pop();
								      console.log("  completed "+currName);
								      if (wipList.length == 0) {
									console.log("Processing finished");
									db.close();
								      }
								    });
						});
					  
					  
			      });
	}
      }
  }
  catch(e)
  {
     console.log(e);
  }

}

/*
  Bulk Prepare statistics document with id = STATS for the currencies.
  */
function prepareStatistics(db)
{
   for(var key in currency_list)
     {
       db.collection(key, function(err, coll)
                    {
                      var stream = coll.find().stream();
                      var stats = {};
                      stats["_id"] = "STATS_"+key;
                      stats["_base"] = key;
                      for(var curr in currency_list)
                        {

                          stats[curr] = {sum:0,count:0,avg:0,max:0,min:0};

                        }
			var max = {};
			var min = {};
                      stream.on('data',function(item)
                               {
				 
				
                                 for(var curr in item)
                                   {
				    				  
				    if (max[curr]==null) {
				      max[curr] = -1;
				    }
				    
				     if (min[curr]==null) {
				      min[curr] = 1000000;
				    }
                                     if(curr != "_id" && curr != key && stats[curr]!=null)
                                       {
					
					  if (max[curr] <= item[curr]) {
					    max[curr] = item[curr];
					  }
					  if (min[curr] >= item[curr]) {
					    min[curr] = item[curr];
					  }
                                         (stats[curr])["sum"] += item[curr];
                                         (stats[curr])["count"] += 1;
                                         (stats[curr])["avg"]=(stats[curr])["sum"]/(stats[curr])["count"];
                                       }
                                    
                                   }
				   
				   for(var curr in max)
				  {
				    if (stats[curr]!=null) {
				     
				      (stats[curr])["max"] = max[curr];
				      (stats[curr])["min"] = min[curr];
				    }
				  }

                               }).on('end',function()
                                     {
                                       db.collection(MONGO_COLL_AGG).update({"_id" : stats["_id"]},stats,{upsert:true}, function(err,result)
                                                   {
                                                     if(err) throw err;
                                                   });

                                    });
                    });
     }
     console.log("Done..");
};

function bulkNormalise(mongo_db_url)
{
    if(mongo_db_url==null)
      {
        mongo_db_url=MONGO_DB_URL;
        console.log("Using default DB URL.");
      }
    
    mongoClient.connect(mongo_db_url, function(err,db)
			{
			  db.collection(MONGO_COLL_AGG, function(err,agg)
						  {
						    if (err) {
						     console.log(err);
						    }
						    
						    for(var base in currency_list)
						    {
						      db.collection("NORM_"+base, function(err,coll)
								    {
								      coll.drop();
								    });
						    }
						    
						    var stream = agg.find().stream(); 
						    
						    var aggData = {};
						    stream.on('data', function(data)
							      {
								aggData[data._base] = data;
							      });
						    
						    stream.on('end',function()
								    {
								    //Begin processing
								    var normalisingList = [];
								      for(var base in currency_list)
								      {
									  
									
									console.log("Normalising: "+base);
									normalisingList.push(base);
									  
									db.collection(base, function(err,coll)
										      {
											var baseAggData = aggData[base];
											var localBase = base;
											var normDataSet = []
											var baseStr = coll.find().stream();
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
												      db.collection("NORM_"+localBase, function(err,coll)
														    {
														      
														      coll.insert(normDataSet, {safe:false},function(err,result)
																  {
																    if (err) {
																      console.log(err);
																    }
																    console.log("Done: "+localBase);
																   
																	  
																    normalisingList.pop();
																    if (normalisingList.length == 0) {
																      console.log("Normalisation complete..");
																      process.exit();
																    }
																    });
														    });
												   });
										      });
									
									  }
									
								      
								    
								    });
						  }
						  );
			 
			
			});
};
/*
Data

Currency List from service
*/

const currency_list={
	"AED": "United Arab Emirates Dirham",
	"AFN": "Afghan Afghani",
	"ALL": "Albanian Lek",
	"AMD": "Armenian Dram",
	"ANG": "Netherlands Antillean Guilder",
	"AOA": "Angolan Kwanza",
	"ARS": "Argentine Peso",
	"AUD": "Australian Dollar",
	"AWG": "Aruban Florin",
	"AZN": "Azerbaijani Manat",
	"BAM": "Bosnia-Herzegovina Convertible Mark",
	"BBD": "Barbadian Dollar",
	"BDT": "Bangladeshi Taka",
	"BGN": "Bulgarian Lev",
	"BHD": "Bahraini Dinar",
	"BIF": "Burundian Franc",
	"BMD": "Bermudan Dollar",
	"BND": "Brunei Dollar",
	"BOB": "Bolivian Boliviano",
	"BRL": "Brazilian Real",
	"BSD": "Bahamian Dollar",
	"BTC": "Bitcoin",
	"BTN": "Bhutanese Ngultrum",
	"BWP": "Botswanan Pula",
	"BYR": "Belarusian Ruble",
	"BZD": "Belize Dollar",
	"CAD": "Canadian Dollar",
	"CDF": "Congolese Franc",
	"CHF": "Swiss Franc",
	"CLF": "Chilean Unit of Account (UF)",
	"CLP": "Chilean Peso",
	"CNY": "Chinese Yuan",
	"COP": "Colombian Peso",
	"CRC": "Costa Rican Colón",
	"CUP": "Cuban Peso",
	"CVE": "Cape Verdean Escudo",
	"CZK": "Czech Republic Koruna",
	"DJF": "Djiboutian Franc",
	"DKK": "Danish Krone",
	"DOP": "Dominican Peso",
	"DZD": "Algerian Dinar",
	"EEK": "Estonian Kroon",
	"EGP": "Egyptian Pound",
	"ERN": "Eritrean Nakfa",
	"ETB": "Ethiopian Birr",
	"EUR": "Euro",
	"FJD": "Fijian Dollar",
	"FKP": "Falkland Islands Pound",
	"GBP": "British Pound Sterling",
	"GEL": "Georgian Lari",
	"GGP": "Guernsey Pound",
	"GHS": "Ghanaian Cedi",
	"GIP": "Gibraltar Pound",
	"GMD": "Gambian Dalasi",
	"GNF": "Guinean Franc",
	"GTQ": "Guatemalan Quetzal",
	"GYD": "Guyanaese Dollar",
	"HKD": "Hong Kong Dollar",
	"HNL": "Honduran Lempira",
	"HRK": "Croatian Kuna",
	"HTG": "Haitian Gourde",
	"HUF": "Hungarian Forint",
	"IDR": "Indonesian Rupiah",
	"ILS": "Israeli New Sheqel",
	"IMP": "Manx pound",
	"INR": "Indian Rupee",
	"IQD": "Iraqi Dinar",
	"IRR": "Iranian Rial",
	"ISK": "Icelandic Króna",
	"JEP": "Jersey Pound",
	"JMD": "Jamaican Dollar",
	"JOD": "Jordanian Dinar",
	"JPY": "Japanese Yen",
	"KES": "Kenyan Shilling",
	"KGS": "Kyrgystani Som",
	"KHR": "Cambodian Riel",
	"KMF": "Comorian Franc",
	"KPW": "North Korean Won",
	"KRW": "South Korean Won",
	"KWD": "Kuwaiti Dinar",
	"KYD": "Cayman Islands Dollar",
	"KZT": "Kazakhstani Tenge",
	"LAK": "Laotian Kip",
	"LBP": "Lebanese Pound",
	"LKR": "Sri Lankan Rupee",
	"LRD": "Liberian Dollar",
	"LSL": "Lesotho Loti",
	"LTL": "Lithuanian Litas",
	"LVL": "Latvian Lats",
	"LYD": "Libyan Dinar",
	"MAD": "Moroccan Dirham",
	"MDL": "Moldovan Leu",
	"MGA": "Malagasy Ariary",
	"MKD": "Macedonian Denar",
	"MMK": "Myanma Kyat",
	"MNT": "Mongolian Tugrik",
	"MOP": "Macanese Pataca",
	"MRO": "Mauritanian Ouguiya",
	"MTL": "Maltese Lira",
	"MUR": "Mauritian Rupee",
	"MVR": "Maldivian Rufiyaa",
	"MWK": "Malawian Kwacha",
	"MXN": "Mexican Peso",
	"MYR": "Malaysian Ringgit",
	"MZN": "Mozambican Metical",
	"NAD": "Namibian Dollar",
	"NGN": "Nigerian Naira",
	"NIO": "Nicaraguan Córdoba",
	"NOK": "Norwegian Krone",
	"NPR": "Nepalese Rupee",
	"NZD": "New Zealand Dollar",
	"OMR": "Omani Rial",
	"PAB": "Panamanian Balboa",
	"PEN": "Peruvian Nuevo Sol",
	"PGK": "Papua New Guinean Kina",
	"PHP": "Philippine Peso",
	"PKR": "Pakistani Rupee",
	"PLN": "Polish Zloty",
	"PYG": "Paraguayan Guarani",
	"QAR": "Qatari Rial",
	"RON": "Romanian Leu",
	"RSD": "Serbian Dinar",
	"RUB": "Russian Ruble",
	"RWF": "Rwandan Franc",
	"SAR": "Saudi Riyal",
	"SBD": "Solomon Islands Dollar",
	"SCR": "Seychellois Rupee",
	"SDG": "Sudanese Pound",
	"SEK": "Swedish Krona",
	"SGD": "Singapore Dollar",
	"SHP": "Saint Helena Pound",
	"SLL": "Sierra Leonean Leone",
	"SOS": "Somali Shilling",
	"SRD": "Surinamese Dollar",
	"STD": "São Tomé and Príncipe Dobra",
	"SVC": "Salvadoran Colón",
	"SYP": "Syrian Pound",
	"SZL": "Swazi Lilangeni",
	"THB": "Thai Baht",
	"TJS": "Tajikistani Somoni",
	"TMT": "Turkmenistani Manat",
	"TND": "Tunisian Dinar",
	"TOP": "Tongan Paʻanga",
	"TRY": "Turkish Lira",
	"TTD": "Trinidad and Tobago Dollar",
	"TWD": "New Taiwan Dollar",
	"TZS": "Tanzanian Shilling",
	"UAH": "Ukrainian Hryvnia",
	"UGX": "Ugandan Shilling",
	"USD": "United States Dollar",
	"UYU": "Uruguayan Peso",
	"UZS": "Uzbekistan Som",
	"VEF": "Venezuelan Bolívar Fuerte",
	"VND": "Vietnamese Dong",
	"VUV": "Vanuatu Vatu",
	"WST": "Samoan Tala",
	"XAF": "CFA Franc BEAC",
	"XAG": "Silver (troy ounce)",
	"XAU": "Gold (troy ounce)",
	"XCD": "East Caribbean Dollar",
	"XDR": "Special Drawing Rights",
	"XOF": "CFA Franc BCEAO",
	"XPF": "CFP Franc",
	"YER": "Yemeni Rial",
	"ZAR": "South African Rand",
	"ZMK": "Zambian Kwacha (pre-2013)",
	"ZMW": "Zambian Kwacha",
	"ZWL": "Zimbabwean Dollar"
};

/*
EXPORT MODULE
*/
module.exports = new function()
{

  /*
  Connect to Mongo Db and process Raw currency store to convert it into a from-to format ordered by currency names
  */
  this.process = function(mongo_db_url,coll_name,record_id)
  {
    if(mongo_db_url==null)
      {
        mongo_db_url=MONGO_DB_URL;
        console.log("Using default DB URL.");
      }
    if(coll_name==null)
      {
        coll_name=MONGO_COLL_RAW;
        console.log("Using default Collection.");
      }
    var bulkMode = false;
    if(record_id==null)
      {
        bulkMode = true;
        console.log("Bulk mode set.");
      }
    else
      {
        console.log("Delta mode set.");
      }
    mongoClient.connect(mongo_db_url, function(err,db)
                     {
                       if(err)throw err;

                       if(bulkMode)
                         {
                            clearAllCurrencies(db);
                         }


                       db.collection(coll_name,function(err,coll)
                                    {
                                      var stream = null;
                                      if(bulkMode)
                                        {
                                          stream=coll.find().stream();
                                        }
                                        else
                                        {
                                          stream=coll.find({_id:record_id}).stream();
                                        }

                                      stream.on('data',function(item)
                                               {
                                                 if(!bulkMode)
                                                   {
                                                     console.log("New Item Id: "+item._id);
                                                   }
                                                 writeToMongo(item,db,bulkMode);

                                               }).on('end',function()
                                                    {
                                                      console.log("Done Stream... preparing statistics.");
						      if (bulkMode) {
							console.log("Bulk mode");
							prepareStatistics(db);
							bulkNormalise(mongo_db_url);
						      }
						      
                                                    });



                                    });
                     });
  };


  this.getCurrencyList= function()
  {
    return currency_list;
  };
  
 
}



  