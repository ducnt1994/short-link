const axios = require('axios');

const BASE_URL = 'http://localhost:3000';

async function testAntiSpamFeatures() {
  console.log('🧪 Testing Anti-Spam Features...\n');

  // Test 1: Normal URL shortening
  console.log('1. Testing normal URL shortening...');
  try {
    const response = await axios.post(`${BASE_URL}/api/shortlink/create`, {
      originalUrl: 'https://www.example.com'
    });
    console.log('✅ Success:', response.data.shortUrl);
  } catch (error) {
    console.log('❌ Error:', error.response?.data || error.message);
  }

  // Test 2: Blocked domain
  console.log('\n2. Testing blocked domain...');
  try {
    const response = await axios.post(`${BASE_URL}/api/shortlink/create`, {
      originalUrl: 'https://spam.com/malicious-link'
    });
    console.log('✅ Success:', response.data.shortUrl);
  } catch (error) {
    console.log('❌ Blocked (expected):', error.response?.data?.error || error.message);
  }

  // Test 3: Suspicious keywords
  console.log('\n3. Testing suspicious keywords...');
  try {
    const response = await axios.post(`${BASE_URL}/api/shortlink/create`, {
      originalUrl: 'https://example.com/spam-content'
    });
    console.log('✅ Success:', response.data.shortUrl);
  } catch (error) {
    console.log('❌ Blocked (expected):', error.response?.data?.error || error.message);
  }

  // Test 4: Rate limiting
  console.log('\n4. Testing rate limiting...');
  const promises = [];
  for (let i = 0; i < 5; i++) {
    promises.push(
      axios.post(`${BASE_URL}/api/shortlink/create`, {
        originalUrl: `https://example${i}.com`
      }).catch(err => ({ error: err.response?.data || err.message }))
    );
  }
  
  const results = await Promise.all(promises);
  const successCount = results.filter(r => !r.error).length;
  const blockedCount = results.filter(r => r.error).length;
  console.log(`✅ Success: ${successCount}, ❌ Blocked: ${blockedCount}`);



  // Test 6: Statistics
  console.log('\n5. Testing statistics...');
  try {
    const response = await axios.get(`${BASE_URL}/api/shortlink/stats/overview`);
    console.log('📊 Statistics:', response.data);
  } catch (error) {
    console.log('❌ Error getting stats:', error.message);
  }

  console.log('\n🎉 Anti-spam testing completed!');
}

// Run tests
testAntiSpamFeatures().catch(console.error); 