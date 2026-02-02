const http = require('http');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

// 1. LOAD SECRETS
const envResult = dotenv.config({ path: 'secrets.env' });

console.log("----- DEBUG INFO -----");
if (envResult.error) {
    console.log("❌ Error loading secrets.env:", envResult.error.message);
} else {
    console.log("✅ secrets.env file loaded successfully.");
}

const accountName = process.env.AZURE_STORAGE_ACCOUNT;
let sasToken = process.env.AZURE_SAS_TOKEN;

// === AUTO-FIX: Ensure Token starts with '?' ===
if (sasToken && !sasToken.startsWith('?')) {
    console.log("⚠️  Notice: Added missing '?' to SAS Token.");
    sasToken = '?' + sasToken;
}

console.log("Storage Account:", accountName ? `"${accountName}"` : "MISSING (Undefined)");
console.log("SAS Token:", sasToken ? "FOUND (Valid format)" : "MISSING (Undefined)");
console.log("----------------------");

const PORT = 5173;

const server = http.createServer((req, res) => {
    
    // API Endpoint: Serve cleaned credentials
    if (req.url === '/config') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
            accountName: accountName,
            sasToken: sasToken // Sends the fixed token
        }));
        return;
    }

    // File Serving Logic
    let filePath = req.url === '/' ? 'dashboard.html' : req.url.substring(1);
    const safePath = path.normalize(filePath).replace(/^(\.\.[\/\\])+/, '');
    
    const ext = path.extname(safePath);
    let contentType = 'text/html';
    if (ext === '.js') contentType = 'text/javascript';
    if (ext === '.css') contentType = 'text/css';

    fs.readFile(safePath, (err, content) => {
        if (err) {
            if (err.code === 'ENOENT') {
                res.writeHead(404);
                res.end("404 Not Found");
            } else {
                res.writeHead(500);
                res.end("Server Error: " + err.code);
            }
        } else {
            res.writeHead(200, { 'Content-Type': contentType });
            res.end(content, 'utf-8');
        }
    });
});

console.log(`Server running at http://localhost:${PORT}/`);
console.log(`Press Ctrl+C to stop.`);
server.listen(PORT);