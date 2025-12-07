const https = require('https');
const fs = require('fs');
const path = require('path');

// Load .env
const envPath = path.resolve(__dirname, '../.env');
const envContent = fs.readFileSync(envPath, 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match) {
        let value = match[2].trim();
        if (value.startsWith('"') && value.endsWith('"')) {
            value = value.slice(1, -1);
        }
        env[match[1]] = value;
    }
});

const API_URL = env.PERFEX_API_URL || 'https://skala.narapatistudio.com';
const API_TOKEN = env.PERFEX_API_KEY;

console.log(`Testing Auth Endpoint: ${API_URL}/api/login/auth`);

function testAuth() {
    return new Promise((resolve, reject) => {
        const urlObj = new URL(`${API_URL}/api/login/auth`);
        const postData = JSON.stringify({
            email: 'test@example.com',
            password: 'wrongpassword'
        });

        const options = {
            hostname: urlObj.hostname,
            path: urlObj.pathname,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': postData.length,
                'Authorization': API_TOKEN, // Assuming it needs key? perfexClient passes headers
                'authtoken': API_TOKEN
            }
        };

        const req = https.request(options, (res) => {
            console.log(`Status Code: ${res.statusCode}`);
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
                console.log('Response Body:', data);
                resolve();
            });
        });

        req.on('error', (e) => {
            console.error(`Problem with request: ${e.message}`);
            reject(e);
        });

        req.write(postData);
        req.end();
    });
}

testAuth();
