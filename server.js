const express = require('express');
const path = require('path');
const fs = require('fs');
const app = express();
const PORT = process.env.PORT || 3010;
const DATA_FILE = path.join(__dirname, 'data.json');

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json({ limit: '10mb' }));

// Read data from JSON file
function readData() {
    try {
        if (fs.existsSync(DATA_FILE)) {
            const raw = fs.readFileSync(DATA_FILE, 'utf-8');
            return JSON.parse(raw);
        }
    } catch(e) { console.error('[DATA] Read error:', e.message); }
    return null;
}

// Write data to JSON file
function writeData(income, expenses) {
    try {
        const obj = { income, expenses, updatedAt: new Date().toISOString() };
        fs.writeFileSync(DATA_FILE, JSON.stringify(obj, null, 2), 'utf-8');
        return true;
    } catch(e) { console.error('[DATA] Write error:', e.message); return false; }
}

// GET /api/data - load data
app.get('/api/data', (req, res) => {
    const d = readData();
    if (d) res.json({ success: true, data: { income: d.income||[], expenses: d.expenses||[] } });
    else res.json({ success: true, data: { income: [], expenses: [] } });
});

// POST /api/data - save data
app.post('/api/data', (req, res) => {
    const { income, expenses } = req.body;
    if (!Array.isArray(income) || !Array.isArray(expenses)) {
        return res.status(400).json({ success: false, error: 'Invalid data' });
    }
    const saved = writeData(income, expenses);
    if (saved) {
        console.log('[DATA] Saved:', income.length, 'income,', expenses.length, 'expenses');
        res.json({ success: true, count: income.length });
    } else {
        res.status(500).json({ success: false, error: 'Write failed' });
    }
});

// GET /api/data/download - download backup
app.get('/api/data/download', (req, res) => {
    const d = readData();
    if (d) {
        res.setHeader('Content-Disposition', `attachment; filename="cng-backup-${new Date().toISOString().split('T')[0]}.json"`);
        res.json(d);
    } else {
        res.status(404).json({ error: 'No data' });
    }
});

// POST /api/data/upload - upload backup
app.post('/api/data/upload', (req, res) => {
    const { income, expenses } = req.body;
    if (Array.isArray(income) && Array.isArray(expenses)) {
        writeData(income, expenses);
        res.json({ success: true, count: income.length });
    } else {
        res.status(400).json({ success: false, error: 'Invalid backup file' });
    }
});

// AI Proxy
app.post('/api/chat', async (req, res) => {
    try {
        const { messages } = req.body;
        const aiRes = await fetch('http://localhost:3001/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer freellmapi-452ca8bed210fe077adc380b22db64f8c3ee0e961bf8fb90'
            },
            body: JSON.stringify({ model: 'auto', messages, temperature: 0.7, max_tokens: 2000 })
        });
        if (!aiRes.ok) return res.status(aiRes.status).json({ error: (await aiRes.text()).slice(0,500) });
        res.json(await aiRes.json());
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/ai-status', async (req, res) => {
    try {
        const t = await fetch('http://localhost:3001/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer freellmapi-452ca8bed210fe077adc380b22db64f8c3ee0e961bf8fb90'
            },
            body: JSON.stringify({ model: 'auto', messages:[{role:'user', content:'hi'}], max_tokens:5 }),
            signal: AbortSignal.timeout(5000)
        });
        if (t.ok) res.json({ status:'connected' });
        else res.json({ status:'error' });
    } catch(e) { res.json({ status:'disconnected' }); }
});

// Serve frontend with embedded data
app.get('*', (req, res) => {
    const htmlPath = path.join(__dirname, 'public', 'index.html');
    fs.readFile(htmlPath, 'utf-8', async (err, html) => {
        if (err) return res.status(500).send('Error');
        let dataJson = 'null';
        try {
            const d = readData();
            if (d) dataJson = JSON.stringify({ income: d.income||[], expenses: d.expenses||[] });
        } catch(e) {}
        html = html.replace('"__SERVER_DATA__"', dataJson);
        res.send(html);
    });
});

app.listen(PORT, () => {
    console.log(`\n  🛺  CNG 13-0813 Business System`);
    console.log(`  ═══════════════════════════════`);
    console.log(`  ➜  URL:   https://cng-13-0813.onrender.com`);
    console.log(`  ➜  Data:  ${DATA_FILE}\n`);
});
