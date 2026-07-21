const express = require('express');
const path = require('path');
const fs = require('fs');
const app = express();
const PORT = process.env.PORT || 3010;
const DATA_FILE = path.join(__dirname, 'data.json');

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json({ limit: '10mb' }));

// Read/write JSON file
function readData() {
    try { if (fs.existsSync(DATA_FILE)) return JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8')); } catch(e) {}
    return null;
}
function writeData(income, expenses) {
    try { fs.writeFileSync(DATA_FILE, JSON.stringify({ income, expenses, updatedAt: new Date().toISOString() }), 'utf-8'); return true; } catch(e) { return false; }
}

// API: Get data
app.get('/api/data', (req, res) => {
    const d = readData();
    res.json({ success: true, data: d ? { income: d.income||[], expenses: d.expenses||[] } : { income: [], expenses: [] } });
});

// API: Save data
app.post('/api/data', (req, res) => {
    const { income, expenses } = req.body;
    if (!Array.isArray(income) || !Array.isArray(expenses)) return res.status(400).json({ success: false });
    writeData(income, expenses);
    res.json({ success: true });
});

// AI Proxy (unchanged)
app.post('/api/chat', async (req, res) => {
    try {
        const { messages } = req.body;
        const ai = await fetch('http://localhost:3001/v1/chat/completions', { method:'POST',
            headers:{'Content-Type':'application/json','Authorization':'Bearer freellmapi-452ca8bed210fe077adc380b22db64f8c3ee0e961bf8fb90'},
            body:JSON.stringify({model:'auto', messages, temperature:0.7, max_tokens:2000}) });
        if (!ai.ok) return res.status(ai.status).json({error:(await ai.text()).slice(0,500)});
        res.json(await ai.json());
    } catch(e) { res.status(500).json({error:e.message}); }
});
app.get('/api/ai-status', async (req, res) => {
    try { const t=await fetch('http://localhost:3001/v1/chat/completions',{method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer freellmapi-452ca8bed210fe077adc380b22db64f8c3ee0e961bf8fb90'},body:JSON.stringify({model:'auto',messages:[{role:'user',content:'hi'}],max_tokens:5}),signal:AbortSignal.timeout(5000)}); if(t.ok) res.json({status:'connected'}); else res.json({status:'error'}); } catch(e) { res.json({status:'disconnected'}); }
});

app.get('*', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

app.listen(PORT, () => {
    console.log(`\n  🛺  CNG 13-0813 Business System  [PORT: ${PORT}]`);
    console.log(`  ═══════════════════════════════════════`);
    console.log(`  🔗 ${PORT === 3010 ? 'Render: https://cng-13-0813.onrender.com' : 'Local: http://localhost:'+PORT}`);
    console.log(`  📁 Data: ${DATA_FILE}`);
    console.log(`  ⚡ Auto-sync via /api/data\n`);
});
