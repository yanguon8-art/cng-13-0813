const express = require('express');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3010; // Fallback if 3005 busy

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json({ limit: '10mb' }));

// AI Chat Proxy API
app.post('/api/chat', async (req, res) => {
    try {
        const { messages } = req.body;
        console.log('[AI] Request received, messages:', messages.length);

        const aiResponse = await fetch('http://localhost:3001/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer freellmapi-452ca8bed210fe077adc380b22db64f8c3ee0e961bf8fb90'
            },
            body: JSON.stringify({
                model: 'auto',
                messages: messages,
                temperature: 0.7,
                max_tokens: 2000,
                stream: false
            })
        });

        console.log('[AI] Response status:', aiResponse.status);

        if (!aiResponse.ok) {
            const errText = await aiResponse.text();
            console.error('[AI] Error response:', errText.slice(0, 500));
            return res.status(aiResponse.status).json({ error: errText.slice(0, 500) });
        }

        const data = await aiResponse.json();
        console.log('[AI] Success, choices:', data.choices?.length);
        res.json(data);
    } catch (err) {
        console.error('[AI] Proxy Error:', err.message);
        res.status(500).json({ error: err.message });
    }
});

// AI Server health check
app.get('/api/ai-status', async (req, res) => {
    try {
        console.log('[AI] Checking status...');
        const testRes = await fetch('http://localhost:3001/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer freellmapi-452ca8bed210fe077adc380b22db64f8c3ee0e961bf8fb90'
            },
            body: JSON.stringify({
                model: 'auto',
                messages: [{ role: 'user', content: 'hi' }],
                max_tokens: 5
            }),
            signal: AbortSignal.timeout(10000)
        });

        if (testRes.ok) {
            const data = await testRes.json();
            console.log('[AI] Status OK, model:', data.model);
            res.json({ status: 'connected', model: data.model || 'auto' });
        } else {
            const text = await testRes.text().catch(() => '');
            console.error('[AI] Status error:', testRes.status, text.slice(0, 200));
            res.json({ status: 'error', detail: `HTTP ${testRes.status}: ${text.slice(0, 200)}` });
        }
    } catch (err) {
        console.error('[AI] Status check failed:', err.message);
        res.json({ status: 'disconnected', detail: err.message });
    }
});

// Serve index.html for all routes
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
    console.log(`\n  🛺  CNG 13-0813 Business System`);
    console.log(`  ═══════════════════════════════`);
    console.log(`  ➜  Local:   http://localhost:3005`);
    console.log(`  ➜  AI:      http://localhost:3001 (required for AI Chat)\n`);
});
