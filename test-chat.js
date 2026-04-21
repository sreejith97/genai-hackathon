const http = require('http');

async function test() {
  const req = http.request('http://localhost:3000/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, (res) => {
    console.log('Status:', res.statusCode);
    res.on('data', d => process.stdout.write(d));
  });
  
  req.write(JSON.stringify({
    messages: [{ role: 'user', content: 'hey what is groq' }]
  }));
  req.end();
}

test();
