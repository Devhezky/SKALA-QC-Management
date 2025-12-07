const https = require('https');
const fs = require('fs');
const path = require('path');

// Load .env manually since we are in a standalone script
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

const API_URL = env.PERFEX_API_URL;
const API_TOKEN = env.PERFEX_API_KEY;

console.log('=== API Connection Test ===');
console.log(`URL: ${API_URL}`);
// console.log(`Token: ${API_TOKEN}`); // Keep private

function makeRequest(urlPath, headers = {}, label = 'Request') {
    return new Promise((resolve, reject) => {
        const fullUrl = `${API_URL}${urlPath}`;
        console.log(`\n[${label}] Testing: ${fullUrl}`);

        const urlObj = new URL(fullUrl);

        const options = {
            hostname: urlObj.hostname,
            path: urlObj.pathname + urlObj.search,
            method: 'GET',
            headers: headers
        };

        const req = https.request(options, (res) => {
            console.log(`[${label}] Status Code: ${res.statusCode}`);

            let data = '';
            res.on('data', check => { data += check; });
            res.on('end', () => {
                console.log(`[${label}] Response Header:`, res.headers['content-type']);
                try {
                    // Try to verify if it's valid JSON
                    const json = JSON.parse(data);
                    console.log(`[${label}] JSON Response (Preview):`, JSON.stringify(json).substring(0, 100) + '...');
                    resolve({ status: res.statusCode, data: json });
                } catch (e) {
                    console.log(`[${label}] Response is likely HTML or Text (Preview):`, data.substring(0, 500));
                    resolve({ status: res.statusCode, raw: data });
                }
            });
        });

        req.on('error', (e) => {
            console.error(`[${label}] Error: ${e.message}`);
            reject(e);
        });

        req.end();
    });
}

async function runTests() {
    // Test 1: Standard API (Staffs) - mimics perfex-client.ts
    // headers: { 'Authorization': token, 'authtoken': token } 
    // Trying both as seen in client code comments
    try {
        await makeRequest('/api/staffs', { // Assuming valid endpoint from client code
            'Authorization': API_TOKEN,
            'authtoken': API_TOKEN
        }, 'Standard API Test (Staffs)');
    } catch (e) { console.error('Test 1 failed to execute'); }

    // Test 2: Standard API (Projects) - This is what we really want
    try {
        await makeRequest('/api/projects', {
            'Authorization': API_TOKEN,
            'authtoken': API_TOKEN
        }, 'Standard API Test (Projects)');
    } catch (e) { console.error('Test 2 failed to execute'); }

    // Test 3: Integration Endpoint - original path
    try {
        await makeRequest('/index.php/qc_integration/qc_api/get_projects', {}, 'Integration Endpoint (No Auth) /index.php/...');
    } catch (e) { console.error('Test 3 failed to execute'); }

    // Test 4: Integration Endpoint - without index.php
    try {
        await makeRequest('/qc_integration/qc_api/get_projects', {}, 'Integration Endpoint (No Auth) /qc_integration/...');
    } catch (e) { console.error('Test 4 failed to execute'); }

    // Test 5: Integration Endpoint - WITH headers (just in case)
    try {
        await makeRequest('/index.php/qc_integration/qc_api/get_projects', {
            'Authorization': API_TOKEN,
            'authtoken': API_TOKEN
        }, 'Integration Endpoint (With Auth)');
    } catch (e) { console.error('Test 5 failed to execute'); }

    // Test 6: Standard API (Customers/Clients)
    try {
        await makeRequest('/api/customers', {
            'Authorization': API_TOKEN,
            'authtoken': API_TOKEN
        }, 'Standard API Test (Customers)');
    } catch (e) { console.error('Test 6 failed to execute'); }

    // Test 7: Standard API (Contacts)
    try {
        await makeRequest('/api/contacts', {
            'Authorization': API_TOKEN,
            'authtoken': API_TOKEN
        }, 'Standard API Test (Contacts)');
    } catch (e) { console.error('Test 7 failed to execute'); }

    // Test 8: Alternative Staff Endpoints
    const staffAlternatives = ['/api/staff', '/api/users', '/api/employees', '/api/members'];
    for (const alt of staffAlternatives) {
        try {
            await makeRequest(alt, { 'Authorization': API_TOKEN, 'authtoken': API_TOKEN }, `Alternative Staff Test (${alt})`);
        } catch (e) { }
    }
}

runTests();
