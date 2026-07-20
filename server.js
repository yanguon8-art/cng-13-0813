const express = require('express');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3010;

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json({ limit: '10mb' }));

// AI Chat Proxy (works only on local network)
app.post('/api/chat', async (req, res) => {
    try {
        const { messages } = req.body;
        const aiRes = await fetch('http://localhost:3001/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer freellmapi-452ca8bed210fe077adc380b22db64f8c3ee0e961bf8fb90'
            },
            body: JSON.stringify({ model: 'auto', messages, temperature: 0.7, max_tokens: 2000, stream: false })
        });
        if (!aiRes.ok) return res.status(aiRes.status).json({ error: (await aiRes.text()).slice(0,500) });
        res.json(await aiRes.json());
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/ai-status', async (req, res) => {
    try {
        const testRes = await fetch('http://localhost:3001/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer freellmapi-452ca8bed210fe077adc380b22db64f8c3ee0e961bf8fb90'
            },
            body: JSON.stringify({ model: 'auto', messages: [{ role: 'user', content: 'hi' }], max_tokens: 5 }),
            signal: AbortSignal.timeout(5000)
        });
        if (testRes.ok) res.json({ status: 'connected', model: (await testRes.json()).model || 'auto' });
        else res.json({ status: 'error' });
    } catch (err) {
        res.json({ status: 'disconnected' });
    }
});

app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
    console.log(`\n  🛺  CNG 13-0813 Business System`);
    console.log(`  ═══════════════════════════════`);
    console.log(`  ➜  Port: ${PORT}`);
    console.log(`  ➜  AI:  http://localhost:3001\n`);
});
