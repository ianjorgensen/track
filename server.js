var server = require('router').create();
var common = require('common');
var podio = require('podio');

var port = process.argv[2] || 9082;

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

server.get('/data', function(request, response) {
	podio.biomarkers(respond(response));
});

server.listen(port);

console.log('server running on port',port);

process.on('uncaughtException', function(err) { console.log(err.stack) });