http= require('http');

proxy_host = 'localhost';
proxy_port = 9000;
proxy_location = 'http://'+proxy_host+':'+proxy_port;

target_host = 'stackoverflow.com';
target_location = 'http://'+target_host;
target_port = 80;

regex_absolute = new RegExp('http:\\/\\/'+target_host,'g');
regex_relative = new RegExp('(<(a|img)[^>]+(href|src)=")(?!http)([^"]+)','g');

http.createServer(function (req, res ) {

  var headers = req.headers;

  headers['host'] = target_host;
  headers['x-forwarded-for'] = req.connection.remoteAddress || req.connection.socket.remoteAddress;
  headers['x-forwarded-port'] = req.connection.remotePort || req.connection.socket.remotePort;
  headers['x-forwarded-proto'] = res.connection.pair ? 'https' : 'http';
  delete headers['accept-encoding'];

  options = {
    host: target_host,
    port: target_port,
    method: req.method,
    path: req.url,
    headers: headers
  };

  console.log('REQUEST: ' + JSON.stringify(req.headers));

  proxy = http.request(options,function(response){
    console.log('response started');
    console.log('STATUS: ' + response.statusCode);
    console.log('HEADERS: ' + JSON.stringify(response.headers));

    response.setEncoding('utf8');

    // Set the headers of the client response
    res.writeHead(response.statusCode, response.headers);

    // `response.statusCode === 304`: No 'data' event and no 'end'
    if (response.statusCode === 304) {
      console.log('304');
      return res.end();
    } 

    html = '';
    response.on('data',function(chunk){
      console.log('response data', chunk);
      html += chunk;
    });

    response.on('end',function(chunk){
      html = html.replace(regex_absolute, proxy_location);
      html = html.replace(regex_relative, '$1'+ proxy_location +'$4');

      res.end(html);
    });
  });

  req.on('data', function (chunk) {
    proxy.write(chunk);
  });

  req.on('end', function () {
    proxy.end();
  });
}).listen(9000);
console.log('listening on '+proxy_port);
