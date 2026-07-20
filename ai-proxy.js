const http = require('http');
const AI_PORT = 3001;
const PROXY_PORT = 3006;

const server = http.createServer((req, res) => {
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', '*');

    if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
    }

    console.log('[PROXY] ' + req.method + ' ' + req.url);

    const options = {
        hostname: '127.0.0.1',
        port: AI_PORT,
        path: req.url,
        method: req.method,
        headers: Object.assign({}, req.headers, { host: '127.0.0.1:' + AI_PORT })
    };

    const proxyReq = http.request(options, (proxyRes) => {
        res.writeHead(proxyRes.statusCode, proxyRes.headers);
        proxyRes.pipe(res);
    });

    proxyReq.on('error', (e) => {
        console.error('[PROXY] Error: ' + e.message);
        res.writeHead(502, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'AI Server not running on port ' + AI_PORT }));
    });

    req.pipe(proxyReq);
});

server.listen(PROXY_PORT, '0.0.0.0', () => {
    console.log('');
    console.log('  🛺 CNG AI Proxy Server');
    console.log('  ========================');
    console.log('  ✅ Running on port ' + PROXY_PORT);
    console.log('  🔗 Use in website: 100.93.6.106');
    console.log('  ⏳ Press Ctrl+C to stop');
    console.log('');
});
