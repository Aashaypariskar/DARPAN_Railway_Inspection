const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');

async function testUpload() {
    const formData = new FormData();
    // Use any small file from the system for testing
    formData.append('photo', fs.createReadStream('package.json'));

    const url = 'http://127.0.0.1:8082/api/upload-photo?module_type=TEST&session_id=123&question_id=999&image_stage=before';
    
    console.log('Testing upload to:', url);
    
    try {
        const response = await axios.post(url, formData, {
            headers: {
                ...formData.getHeaders(),
                // Add a dummy token or skip verifyToken if possible, 
                // but usually we need a valid one.
                // Assuming verifyToken is permissive for tests or we use a known one.
            }
        });
        console.log('SUCCESS:', response.data);
    } catch (error) {
        if (error.response) {
            console.error('ERROR (Server):', error.response.status, error.response.data);
        } else if (error.request) {
            console.error('ERROR (Network):', error.message);
        } else {
            console.error('ERROR (Other):', error.message);
        }
    }
}

testUpload();
