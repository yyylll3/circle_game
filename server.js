const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3888;

const store = {
  ranking: []
};

function parseBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (e) {
        resolve({});
      }
    });
    req.on('error', reject);
  });
}

function send(res, status, data) {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.writeHead(status);
  res.end(JSON.stringify(data));
}

const server = http.createServer(async (req, res) => {
  const url = req.url.split('?')[0];
  const method = req.method;

  if (url === '/api/ranking' && method === 'GET') {
    const list = [...store.ranking].sort((a, b) => (b.score - a.score)).slice(0, 50);
    return send(res, 200, { ranking: list });
  }

  if (url === '/api/submit' && method === 'POST') {
    const body = await parseBody(req);
    const name = String(body.name || '匿名').trim().slice(0, 20) || '匿名';
    const score = Math.min(100, Math.max(0, parseInt(body.score, 10) || 0));
    store.ranking.push({
      name,
      score,
      time: Date.now()
    });
    const list = [...store.ranking].sort((a, b) => (b.score - a.score)).slice(0, 50);
    return send(res, 200, { ok: true, ranking: list });
  }

  if (url === '/api/reset' && method === 'POST') {
    store.ranking = [];
    return send(res, 200, { ok: true, ranking: [] });
  }

  if (url === '/' || url === '/index.html' || url === '') {
    const file = path.join(__dirname, 'index.html');
    const content = fs.readFileSync(file, 'utf8');
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.writeHead(200);
    return res.end(content);
  }

  res.writeHead(404);
  res.end('Not Found');
});

server.listen(PORT, '0.0.0.0', () => {
  console.log('画圆大作战 已启动: http://localhost:' + PORT);
  console.log('手机请访问: http://你的电脑IP:' + PORT);
});
