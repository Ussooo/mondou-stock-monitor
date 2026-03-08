const express = require('express');
const basicAuth = require('express-basic-auth');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(basicAuth({
    users: { 'admin': 'password' },
    challenge: true,
    realm: 'StockTracker'
}));

app.use(express.static(path.join(__dirname, 'public')));

const DATA_FILE = path.join(__dirname, 'data.json');

app.get('/api/products', (req, res) => {
    fs.readFile(DATA_FILE, 'utf8', (err, data) => {
        if (err) return res.status(500).json({ error: 'Read error' });
        res.json(JSON.parse(data || '[]'));
    });
});

app.post('/api/products', (req, res) => {
    const { productName, productUrl, productMerchant } = req.body;
    
    fs.readFile(DATA_FILE, 'utf8', (err, data) => {
        if (err) return res.status(500).json({ error: 'Read error' });
        
        const products = JSON.parse(data || '[]');
        const newId = products.length > 0 ? products[products.length - 1].id + 1 : 1;
        
        const newProduct = {
            id: newId,
            name: productName,
            url: productUrl,
            merchant: productMerchant || 'Unknown',
            lastPrice: 'N/A',
            lastChecked: 'Never',
            status: 'Pending',
            history: []
        };
        
        products.push(newProduct);
        
        fs.writeFile(DATA_FILE, JSON.stringify(products, null, 2), (writeErr) => {
            if (writeErr) return res.status(500).json({ error: 'Write error' });
            res.status(201).json(newProduct);
        });
    });
});

app.delete('/api/products/:id', (req, res) => {
    const productId = req.params.id; // Keep as string for loose comparison
    
    fs.readFile(DATA_FILE, 'utf8', (err, data) => {
        if (err) return res.status(500).json({ error: 'Read error' });
        
        let products = JSON.parse(data || '[]');
        const initialLength = products.length;
        
        // Use loose inequality (!=) to match ID regardless of type (string/number)
        products = products.filter(p => p.id != productId);
        
        if (products.length === initialLength) {
            console.log(`Delete failed: ID ${productId} not found. Available IDs:`, products.map(p => p.id));
            return res.status(404).json({ error: 'Product not found' });
        }
        
        fs.writeFile(DATA_FILE, JSON.stringify(products, null, 2), (writeErr) => {
            if (writeErr) return res.status(500).json({ error: 'Write error' });
            res.status(200).json({ message: 'Product deleted' });
        });
    });
});

app.post('/api/check-stock', (req, res) => {
    console.log("Starting background stock check...");
    
    const child = exec('node check-stock.js');

    // This pipes the scraper's logs directly to your terminal
    child.stdout.on('data', (data) => {
        console.log(`[Scraper Log]: ${data.trim()}`);
    });

    child.stderr.on('data', (data) => {
        console.error(`[Scraper Error]: ${data.trim()}`);
    });

    child.on('close', (code) => {
        console.log(`Scraper process finished with code ${code}`);
        res.json({ message: 'Stock check complete' });
    });
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});