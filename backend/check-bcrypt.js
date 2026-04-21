const bcrypt = require('bcryptjs');

const password = 'password123';
const hash = '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4.qO.1BoWBPfGKWe';

async function checkBcrypt() {
    try {
        const result = await bcrypt.compare(password, hash);
        console.log(`Password: ${password}`);
        console.log(`Hash: ${hash}`);
        console.log(`Does it match? ${result ? 'YES' : 'NO'}`);
        
        // Let's try to generate a new hash and check it
        const newHash = await bcrypt.hash(password, 12);
        console.log(`New Hash: ${newHash}`);
        const newMatch = await bcrypt.compare(password, newHash);
        console.log(`Does new match work? ${newMatch ? 'YES' : 'NO'}`);
        
    } catch (err) {
        console.error('Bcrypt error:', err);
    }
}

checkBcrypt();
