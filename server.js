import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import axios from 'axios';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Serve static files from the build directory
app.use(express.static(path.join(__dirname, 'dist')));

// --- API Proxy Routes ---

// 1. Market Data Proxy (Solves CORS)
app.get('/api/market', async (req, res) => {
    const { exchange, symbol, interval } = req.query;
    
    try {
        let data = [];
        
        if (exchange === 'BINANCE') {
            const url = `https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=${interval || '1d'}&limit=500`;
            const response = await axios.get(url);
            data = response.data.map(d => ({
                date: new Date(d[0]).toISOString().split('T')[0],
                open: parseFloat(d[1]),
                high: parseFloat(d[2]),
                low: parseFloat(d[3]),
                close: parseFloat(d[4]),
                volume: parseFloat(d[5]),
            }));
        } else if (exchange === 'OKX') {
            const url = `https://www.okx.com/api/v5/market/candles?instId=${symbol}&bar=1D&limit=300`;
            const response = await axios.get(url);
            if (response.data.code !== '0') throw new Error(response.data.msg);
            data = response.data.data.reverse().map(d => ({
                date: new Date(parseInt(d[0])).toISOString().split('T')[0],
                open: parseFloat(d[1]),
                high: parseFloat(d[2]),
                low: parseFloat(d[3]),
                close: parseFloat(d[4]),
                volume: parseFloat(d[5]),
            }));
        } else if (exchange === 'COINBASE') {
            const url = `https://api.exchange.coinbase.com/products/${symbol}/candles?granularity=86400`;
            const response = await axios.get(url, { headers: { 'User-Agent': 'NodeJS' } });
            data = response.data.reverse().map(d => ({
                date: new Date(d[0] * 1000).toISOString().split('T')[0],
                low: d[1],
                high: d[2],
                open: d[3],
                close: d[4],
                volume: d[5],
            }));
        }

        res.json(data);

    } catch (error) {
        console.error('Market API Error:', error.message);
        res.status(500).json({ error: 'Failed to fetch market data', details: error.message });
    }
});

// 2. AI Proxy (Protects API Keys if set on server, or proxies for CORS)
app.post('/api/ai', async (req, res) => {
    const { provider, apiKey, baseUrl, payload } = req.body;

    // Priority: 1. Server Env Key, 2. Client Key
    const finalApiKey = process.env[`${provider}_API_KEY`] || apiKey;
    
    if (!finalApiKey) {
        return res.status(401).json({ error: 'No API Key provided' });
    }

    try {
        let targetUrl = baseUrl;
        let headers = {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${finalApiKey}`
        };

        // Determine URL based on provider if not custom
        if (provider === 'OPENAI' && !targetUrl) targetUrl = 'https://api.openai.com/v1';
        if (provider === 'DEEPSEEK' && !targetUrl) targetUrl = 'https://api.deepseek.com';
        
        // Remove trailing slash
        targetUrl = targetUrl?.replace(/\/$/, "");

        const response = await axios.post(`${targetUrl}/chat/completions`, payload, { headers });
        res.json(response.data);

    } catch (error) {
        console.error('AI API Error:', error.response?.data || error.message);
        res.status(500).json(error.response?.data || { error: 'AI Request Failed' });
    }
});

// Handle React Routing, return all requests to React app
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});