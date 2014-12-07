var mc=require('mongodb').MongoClient
mc.connect('mongodb://localhost:27017/NYSE',function(err, db)
	{
		if(err)
			throw err;

		db.collectionNames(function(err, collections)
			{
				console.log(collections);

			});
	});
