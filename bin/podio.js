var curly = require('curly');
var common = require('common');
var _ = require('underscore');

var connect = function(callback) {
	var auth = {
		json: true,
		query : {
			grant_type: 'password',
			username: 'jorgensen.ian@gmail.com',
			password: 'med1aluna',
		  client_id: 'line',
		  client_secret: 'hIW3BpksNHNsPU8LIvOYY0UsVJW1vxXTnVLPtfRCubD1pcjpWhhc6ikVQgxjBj5G',
		  redirect_uri: 'http://linehq.com'	
		}
	};
	curly.post('https://podio.com/oauth/token', auth, function(err,response) {
		if(err) {
			callback(err);
			return;
		}
	
		var token = response.body;

		var get = function(path, cb) {
			curly.get('https://api.podio.com' + path,
			{
				json: true,
				headers: {
					authorization : common.format('Bearer {access_token}', token)
				}  
			}
			,function(err, response){
				cb(err, response.body);
			});
		};

		var post = function(path, body, cb) {
			if(!body) {
				body = {};
			}
			curly.post('https://api.podio.com' + path,
			{
				json: true,
				body: body,
				headers: {
					authorization : common.format('Bearer {access_token}', token)
				}  
			}
			,function(err, response){
				cb(err, response.body);
			});
		};

		callback(null, {get: get,post: post});
	});
};

var find = function(arr, obj) {
	for(var i in arr) {
		var el = arr[i];
		var found = true;

		for(var key in obj) {
			if(!el[key] || el[key] !== obj[key]) {
				found = false;
				break;
			}
		}

		if(found) {
			return el;
		}
	}
};

var getValue = function(entry, external_ids) {
	var value = {};

	common.loop(external_ids, function(i, id) {
		var found = find(entry, {external_id: id});

		if(!found) {
			value[id] = '';
			return;
		}

		if(found.type == 'text') {
			value[id] = found.values[0].value;
		}
		if(found.type == 'category') {
			value[id] = found.values[0].value.text;
		}
	})
	
	return value;
};

var normalize = function(text) {
  return text.replace(/ /g,'_').toLowerCase();
};

var rangify = function(client, categories, cb) {
	common.step([
		function(next) {
			common.loop(categories, function(i, category) {
				common.loop(category.biomarkers, function(i, biomarker) {
					if(biomarker.ranges.length) {
						common.loop(biomarker.ranges, function(i, range) {
							//console.log(range.value.item_id);
							
							var url = common.format('/item/{item_id}', range.value);
							client.get(url, next.parallel());
						});
					}
				});
			});
		},
		function(ranges, next) {
			var all = {};
			common.loop(ranges, function(i, range) {
				all[range.item_id] = getValue(range.fields, ['label', 'range', 'outcome', 'width']);
			});
			next(null, all);
		},
		function(all, next) {

			common.loop(categories, function(i, category) {
				common.loop(category.biomarkers, function(j, biomarker) {
					if(biomarker.ranges.length) {
						common.loop(biomarker.ranges, function(k, range) {
							categories[i].biomarkers[j].ranges[k] = all[range.value.item_id];
						});
					}
				});
			});
			cb(null, categories);
		}
	], cb);
};

var biomarkers = function(cb) {
	var client;

	connect(function(err, client) {
		if(err) {
			cb(err);
			return;	
		}

		common.step([
			function(next) {
				client.post(common.format('/item/app/{app_id}/filter/{view_id}/', {app_id: 1708319, view_id: 1419681}),{limit: 100}, next);				
			},
			function(data, next) {
				common.loop(data.items, function(i, item) {
					client.get(common.format('/item/{item_id}/value', item), next.parallel());
				});			
			},
			function(data, next) {
				
				var values = [];
				common.loop(data, function(i, entry) {
					var f = find(entry, {external_id:'ranges2'});
					var val = getValue(entry, ['name', 'category', 'general-description-us']);
					val.ranges = f ? f.values : [];
					values.push(val);
				});

				values = _.groupBy(values, function(val){ return val.category});

				var result = {};
				common.loop(values, function(i, group) {
					var category = {
						name: i,
						biomarkers : {}
					}
					common.loop(group, function(i, bio) {
						category.biomarkers[normalize(bio.name)] = bio;
					});

					result[i] = category;
				});

				rangify(client, result, cb);
			}
		], cb);		
	});
};
/*
    heart : {
      name: 'heart',
      biomarkers : {
        ldl: {
          name: 'ldl',
          description: 'Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the industry\'s standard dummy text ever since the 1500s, when an unknown printer took a galley of type and scrambled it to make a type specimen book. It has survived not only five centuries, but also the leap into electronic typesetting, remaining essentially unchanged. It was popularised in the 1960s with the release of Letraset sheets containing Lorem Ipsum passages, and more recently with desktop publishing software like Aldus PageMaker including versions of Lorem Ipsum.',
          ranges: [
          {label: 'normal', width: 20, range: '<100', outcome: 'good'},
          {label: 'ok', width: 50, range: '100 to 200', outcome: 'bad'},
          {label: 'bad', width: 30, range: '> 200', outcome: 'ok'}
          ]
        },
        total_cholesterol: {
          name: 'ldl',
          description: 'Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the industry\'s standard dummy text ever since the 1500s, when an unknown printer took a galley of type and scrambled it to make a type specimen book. It has survived not only five centuries, but also the leap into electronic typesetting, remaining essentially unchanged. It was popularised in the 1960s with the release of Letraset sheets containing Lorem Ipsum passages, and more recently with desktop publishing software like Aldus PageMaker including versions of Lorem Ipsum.',
          ranges: [
          {label: 'normal', width: 20, range: '<100', outcome: 'good'},
          {label: 'ok', width: 50, range: '100 to 200', outcome: 'bad'},
          {label: 'bad', width: 30, range: '> 200', outcome: 'ok'}
          ]
        }
      }
    }
biomarkers(function(err, biomarkers) {
	console.log(JSON.stringify(biomarkers,null,'\t'));
});

*/

exports.connect = connect;
exports.biomarkers = biomarkers;
