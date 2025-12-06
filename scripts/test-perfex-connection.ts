
import axios from 'axios';
import path from 'path';
// Load environment variables from .env file
// Using Node.js native .env loading (requires Node v21.7+)
try {
    process.loadEnvFile(path.resolve(process.cwd(), '.env'));
} catch (e) {
    console.warn('⚠️  Could not load .env file. Assuming variables are already set in environment.');
}

const PERFEX_API_URL = process.env.PERFEX_API_URL;
const PERFEX_API_KEY = process.env.PERFEX_API_KEY;

console.log('--- Perfex API Connection Test ---');
console.log(`PERFEX_API_URL: ${PERFEX_API_URL}`);
console.log(`PERFEX_API_KEY: ${PERFEX_API_KEY ? 'Set (Hidden)' : 'Not Set'}`);

if (!PERFEX_API_URL || !PERFEX_API_KEY) {
    console.error('❌ Missing environment variables. Please check .env file.');
    process.exit(1);
}

const client = axios.create({
    baseURL: PERFEX_API_URL,
    headers: {
        'authtoken': PERFEX_API_KEY
    },
    timeout: 10000
});

async function testConnection() {
    try {
        console.log('\nTesting connection to /api/staffs ...');
        // Try to fetch staffs as a basic connectivity test
        const response = await client.get('/api/staffs');

        console.log(`✅ Connection Successful! Status: ${response.status}`);
        console.log('Response Headers:', response.headers);

        if (response.data) {
            console.log('Response Data Preview:', JSON.stringify(response.data).substring(0, 200) + '...');
        }

    } catch (error: any) {
        console.error('❌ Connection Failed using authtoken header.');
        if (error.response) {
            console.error(`Status: ${error.response.status}`);
            console.error('Data:', error.response.data);
            console.error('Headers:', error.response.headers);
        } else if (error.request) {
            console.error('No response received (Possible Network/CORS/Timeout issue).');
            console.error('Error Details:', error.message);
        } else {
            console.error('Error setting up request:', error.message);
        }

        // Optional: Try with Authorization Bearer if authtoken fails (just in case)
        console.log('\nRetrying with Authorization: Bearer header...');
        try {
            const clientBearer = axios.create({
                baseURL: PERFEX_API_URL,
                headers: {
                    'Authorization': PERFEX_API_KEY
                },
                timeout: 10000
            });
            const responseBearer = await clientBearer.get('/api/staffs');
            console.log(`✅ Connection Successful with Bearer! Status: ${responseBearer.status}`);
        } catch (bearerError: any) {
            console.error('❌ Connection Failed with Bearer header as well.');
            if (bearerError.response) {
                console.error(`Status: ${bearerError.response.status}`);
            } else {
                console.error('Error Details:', bearerError.message);
            }
        }
    }
}

testConnection();
