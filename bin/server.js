var server = require('router').create();
var common = require('common');
var podio = require('./podio');

var port = process.argv[2] || 8080;

var respond = function(response) {
	return function(err, data) {
		var statusCode = 200;
		
		if(err) {
			statusCode = 500;	
			data = err;
		}

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
		client.get('/item/11065013', respond(response));
	});
});

server.get('/data', function(request, response) {
	podio.biomarkers(respond(response));
});

server.listen(8080);

console.log('server running on port',port);

//process.on('uncaughtException', function(err) { console.log(err.stack) });