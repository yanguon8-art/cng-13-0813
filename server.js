const express = require('express');
const path = require('path');
const { MongoClient } = require('mongodb');
const app = express();
const PORT = process.env.PORT || 3010;

const MONGO_URI = 'mongodb+srv://yanguon8_db_user:Qbw4dpdKPr3kUkOg@cluster0.sn0aoyp.mongodb.net/cng-13-0813?retryWrites=true&w=majority';
const DB_NAME = 'cng-13-0813';
const COLLECTION = 'business_data';

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json({ limit: '10mb' }));

let dbClient = null;

// Connect to MongoDB
async function connectDB() {
    try {
        dbClient = new MongoClient(MONGO_URI);
        await dbClient.connect();
        console.log('[MongoDB] ✅ Connected to cloud database');
        return true;
    } catch (e) {
        console.error('[MongoDB] ❌ Connection failed:', e.message);
        return false;
    }
}

// Get data from MongoDB
async function getData() {
    try {
        if (!dbClient) await connectDB();
        const db = dbClient.db(DB_NAME);
        const col = db.collection(COLLECTION);
        const doc = await col.findOne({ _id: 'main_data' });
        return doc ? { income: doc.income || [], expenses: doc.expenses || [] } : null;
    } catch (e) {
        console.error('[MongoDB] Read error:', e.message);
        return null;
    }
}

// Save data to MongoDB
async function setData(income, expenses) {
    try {
        if (!dbClient) await connectDB();
        const db = dbClient.db(DB_NAME);
        const col = db.collection(COLLECTION);
        await col.updateOne(
            { _id: 'main_data' },
            { $set: { income, expenses, updatedAt: new Date().toISOString() } },
            { upsert: true }
        );
        return true;
    } catch (e) {
        console.error('[MongoDB] Write error:', e.message);
        return false;
    }
}

// ==================== DIAGNOSTIC ====================
app.get('/api/db-test', async (req, res) => {
    const result = { status: 'checking', mongodb: false, message: '' };
    try {
        const testClient = new MongoClient(MONGO_URI, { serverSelectionTimeoutMS: 5000 });
        await testClient.connect();
        const db = testClient.db(DB_NAME);
        await db.command({ ping: 1 });
        result.mongodb = true;
        result.status = 'connected';
        result.message = 'MongoDB connection OK';
        // Test read/write
        const col = db.collection(COLLECTION);
        await col.updateOne({ _id: 'test' }, { $set: { test: true, time: Date.now() } }, { upsert: true });
        const doc = await col.findOne({ _id: 'test' });
        result.readWrite = !!doc;
        await testClient.close();
    } catch (e) {
        result.status = 'error';
        result.message = e.message;
        result.code = e.code || 'UNKNOWN';
    }
    console.log('[DIAG]', JSON.stringify(result));
    res.json(result);
});

// ==================== DATA API ====================
app.get('/api/data', async (req, res) => {
    const data = await getData();
    if (data) {
        res.json({ success: true, data });
    } else {
        res.json({ success: true, data: { income: [], expenses: [] } });
    }
});

app.post('/api/data', async (req, res) => {
    const { income, expenses } = req.body;
    if (!Array.isArray(income) || !Array.isArray(expenses)) {
        return res.status(400).json({ success: false, error: 'Invalid format' });
    }
    const saved = await setData(income, expenses);
    if (saved) {
        console.log('[MongoDB] Saved:', income.length, 'income,', expenses.length, 'expenses');
        res.json({ success: true });
    } else {
        res.status(500).json({ success: false, error: 'DB write failed' });
    }
});

// ==================== AI PROXY ====================
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

// Serve frontend
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start server
async function start() {
    await connectDB();
    app.listen(PORT, () => {
        console.log(`\n  🛺  CNG 13-0813 Business System`);
        console.log(`  ═══════════════════════════════`);
        console.log(`  ➜  Public:  https://cng-13-0813.onrender.com`);
        console.log(`  ➜  Local:   http://localhost:${PORT}`);
        console.log(`  ➜  DB:      MongoDB Atlas (Cloud)`);
        console.log(`  ➜  AI:      http://localhost:3001\n`);
    });
}

start();
