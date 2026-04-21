const axios = require('axios');

async function testLogin() {
    const loginData = {
        username: 'admin',
        password: 'password123'
    };

    try {
        console.log('Attempting login to http://localhost:5000/api/auth/login');
        const response = await axios.post('http://localhost:5000/api/auth/login', loginData);
        
        console.log('Login successful!');
        console.log('Status:', response.status);
        console.log('Response data:', JSON.stringify(response.data, null, 2));
    } catch (error) {
        console.error('Login failed!');
        if (error.response) {
            console.error('Status:', error.response.status);
            console.error('Error data:', JSON.stringify(error.response.data, null, 2));
        } else {
            console.error('Error message:', error.message);
        }
    }
}

testLogin();
