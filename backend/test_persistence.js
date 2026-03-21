const http = require('http');

const BASE_URL = 'http://localhost:8081'; // Server runs on 8081

function makeRequest(url, options = {}, data = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(url, options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(body));
        } catch (e) {
          resolve(body);
        }
      });
    });
    req.on('error', reject);
    if (data) {
      req.write(JSON.stringify(data));
    }
    req.end();
  });
}

async function testPersistence() {
  try {
    console.log('Testing answer persistence with composite keys...');

    // Test save checkpoint with existing session
    const sessionId = 6; // Use existing session from cleanup

    const bulkPayload = {
      module_type: 'PITLINE',
      session_id: sessionId,
      answers: [
        {
          question_id: 3000,
          status: 'OK',
          coach_id: 1,
          compartment_id: 'NA',
          subcategory_id: 0,
          activity_type: 'Major'
        },
        {
          question_id: 3001,
          status: 'OK',
          coach_id: 1,
          compartment_id: 'NA',
          subcategory_id: 0,
          activity_type: 'Major'
        }
      ]
    };

    console.log('Payload:', JSON.stringify(bulkPayload, null, 2));

    console.log('Saving answers...');
    const saveResponse = await makeRequest(`${BASE_URL}/api/inspection/save-checkpoint`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, bulkPayload);
    console.log('Save response:', saveResponse);

    // Retrieve answers - need to find the correct endpoint
    console.log('Retrieving answers...');
    const answers = await makeRequest(`${BASE_URL}/api/inspection/answers?session_id=${sessionId}`, {
      method: 'GET'
    });
    console.log(`Retrieved ${answers.length} answers`);

    // Check for duplicates
    const uniqueKeys = new Set();
    let duplicates = 0;
    answers.forEach(answer => {
      const key = `${answer.session_id}_${answer.question_id}_${answer.coach_id || ''}_${answer.compartment_id || ''}_${answer.subcategory_id || ''}_${answer.activity_type || ''}`;
      if (uniqueKeys.has(key)) {
        duplicates++;
      } else {
        uniqueKeys.add(key);
      }
    });

    console.log(`Found ${duplicates} duplicates`);

    // Test update (save again)
    console.log('Testing update (save again)...');
    const saveResponse2 = await makeRequest(`${BASE_URL}/api/inspection/save-checkpoint`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, bulkPayload);
    console.log('Save response 2:', saveResponse2);

    const answersAfterUpdate = await makeRequest(`${BASE_URL}/api/inspection/answers?session_id=${sessionId}`, {
      method: 'GET'
    });
    console.log(`After update: ${answersAfterUpdate.length} answers`);

    // Check duplicates again
    const uniqueKeys2 = new Set();
    let duplicates2 = 0;
    answersAfterUpdate.forEach(answer => {
      const key = `${answer.session_id}_${answer.question_id}_${answer.coach_id || ''}_${answer.compartment_id || ''}_${answer.subcategory_id || ''}_${answer.activity_type || ''}`;
      if (uniqueKeys2.has(key)) {
        duplicates2++;
      } else {
        uniqueKeys2.add(key);
      }
    });

    console.log(`After update: ${duplicates2} duplicates`);

    if (duplicates === 0 && duplicates2 === 0) {
      console.log('✅ Persistence test PASSED: No duplicates, answers persist correctly');
    } else {
      console.log('❌ Persistence test FAILED: Duplicates found');
    }

  } catch (error) {
    console.error('Test failed:', error.message);
    console.error('Full error:', error);
  }
}

testPersistence();