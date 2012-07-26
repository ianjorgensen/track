var server = require('router').create();
var common = require('common');
var podio = require('./podio');

var port = process.argv[2] || 8080;

var respond = function(request, response) {
	return function(err, data) {
		var statusCode = 200;
		
		if(err) {
			statusCode = 500;	
			data = err;
		}

		if (request.query.callback) {
			data = common.format('{0}({1});', request.query.callback, data);
		};

		response.writeHead(statusCode, {'content-type':'application/json'});
		response.end(JSON.stringify(data, null, '\t'));
	}
}

server.get('/', function(request, response) {
	response.writeHead(200, {'Content-Type': 'text/plain'});
  response.write('hi');
  response.end();
});

server.get('/podio', function(request,response) {
	podio.connect(function(err, client) {
		client.get('/item/11065013', respond(request, response));
	});
});

server.get('/data', function(request, response) {
	podio.biomarkers(respond(request, response));
});

server.listen(port);

console.log('server running on port',port);

//process.on('uncaughtException', function(err) { console.log(err.stack) });