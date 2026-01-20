const { createClient } = require('@libsql/client');
require('dotenv').config();

const url = process.env.EXPO_PUBLIC_TURSO_URL;
const authToken = process.env.EXPO_PUBLIC_TURSO_AUTH_TOKEN;

console.log(`Testing connection to: ${url}`);

async function test() {
    const client = createClient({
        url: url,
        authToken: authToken,
    });

    try {
        const rs = await client.execute('SELECT 1');
        console.log('Connection successful:', rs.rows);
    } catch (e) {
        console.error('Connection failed:', e.message);
    }
}

test();
