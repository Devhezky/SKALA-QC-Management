const https = require('https');

const baseUrl = 'https://skala.narapatistudio.com';
const paths = [
    '/qc_integration/qc_sso/login',
    '/index.php/qc_integration/qc_sso/login',
    '/admin/qc_integration/qc_sso/login',
    '/index.php/admin/qc_integration/qc_sso/login',
    '/authentication/login', // Standard login
    '/admin/authentication/login', // Admin login
    '/api/login/auth', // Custom auth endpoint used by verifyCredentials
    '/admin/modules', // Check if we can guess module presence
    '/qc_api/login', // Alternative name
    '/custom_api/login' // Alternative name
];

function checkUrl(path) {
    return new Promise((resolve) => {
        const url = `${baseUrl}${path}`;
        console.log(`Checking: ${url}`);

        const req = https.request(url, { method: 'HEAD' }, (res) => {
            console.log(`Status: ${res.statusCode} for ${path}`);
            resolve({ path, status: res.statusCode });
        });

        req.on('error', (e) => {
            console.log(`Error: ${e.message} for ${path}`);
            resolve({ path, status: 'Error' });
        });

        req.end();
    });
}

async function run() {
    console.log('=== Probing SSO URLs ===');
    for (const path of paths) {
        await checkUrl(path);
    }
}

run();
