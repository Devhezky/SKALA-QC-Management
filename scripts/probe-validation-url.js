const https = require('https');

const baseUrl = 'https://skala.narapatistudio.com';
const paths = [
    '/qc_integration/qc_api/validate_token',
    '/index.php/qc_integration/qc_api/validate_token',
    '/admin/qc_integration/qc_api/validate_token',
    '/index.php/admin/qc_integration/qc_api/validate_token'
];

function checkUrl(path) {
    return new Promise((resolve) => {
        const url = `${baseUrl}${path}`;
        const urlObj = new URL(url);

        console.log(`Checking: ${url}`);

        const options = {
            hostname: urlObj.hostname,
            path: urlObj.pathname,
            method: 'POST', // Validation is a POST request
            headers: {
                'Content-Type': 'application/json',
                'authtoken': 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJ1c2VyIjoibjhuIHByb2plY3QgbWFuYWdlbWVudCIsIm5hbWUiOiIiLCJBUElfVElNRSI6MTc1MDA5Mjk0NH0.vFRvcRv-VjdDE7VdvjklbXmqT01hcfatUa_xM-ubIeg'
            }
        };

        const req = https.request(options, (res) => {
            console.log(`Status: ${res.statusCode} for ${path}`);
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                if (res.statusCode !== 200) {
                    console.log(`Body (${path}):`, data.substring(0, 500)); // Print first 500 chars
                }
                resolve({ path, status: res.statusCode });
            });
        });

        req.on('error', (e) => {
            console.log(`Error: ${e.message} for ${path}`);
            resolve({ path, status: 'Error' });
        });

        req.write(JSON.stringify({ token: 'test' }));
        req.end();
    });
}

async function run() {
    console.log('=== Probing Validation URLs ===');
    for (const path of paths) {
        await checkUrl(path);
    }
}

run();
