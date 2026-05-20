// ========================================
// BACKEND CONNECTIVITY TEST
// Run this in browser console
// ========================================

console.log('\n🔍 Testing Backend Connectivity...\n');

const API_BASE = 'https://master-app-h957.onrender.com/api';
const token = sessionStorage.getItem('token');
const tenantId = localStorage.getItem('selectedTenantId');

console.log('Configuration:');
console.log('  API Base:', API_BASE);
console.log('  Has Token:', !!token);
console.log('  Tenant ID:', tenantId);
console.log('');

// Test 1: Check if backend is reachable (simple GET)
console.log('Test 1: Checking if backend is reachable...');
fetch(API_BASE + '/user/getUserDetails', {
  method: 'GET',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  }
})
.then(response => {
  console.log('✅ Backend is reachable!');
  console.log('   Status:', response.status);
  return response.json();
})
.then(data => {
  console.log('   Response:', data);
  console.log('');
  
  // Test 2: Check listings endpoint
  console.log('Test 2: Checking listings endpoint...');
  return fetch(API_BASE + '/sell-crop/getListings?tenantId=' + tenantId, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'x-tenant-id': tenantId,
      'Content-Type': 'application/json'
    }
  });
})
.then(response => {
  console.log('   Status:', response.status);
  if (response.status === 200) {
    console.log('   ✅ Listings endpoint works!');
  } else {
    console.log('   ❌ Listings endpoint returned error:', response.status);
  }
  return response.json();
})
.then(data => {
  console.log('   Response:', data);
  console.log('   Data count:', data.data?.length || 0);
  console.log('');
  
  // Test 3: Check procurement endpoint
  console.log('Test 3: Checking procurement endpoint...');
  return fetch(API_BASE + '/procurement/getPurchases?tenantId=' + tenantId, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'x-tenant-id': tenantId,
      'Content-Type': 'application/json'
    }
  });
})
.then(response => {
  console.log('   Status:', response.status);
  if (response.status === 200) {
    console.log('   ✅ Procurement endpoint works!');
  } else {
    console.log('   ❌ Procurement endpoint returned error:', response.status);
  }
  return response.json();
})
.then(data => {
  console.log('   Response:', data);
  console.log('   Data count:', data.data?.length || 0);
  console.log('');
  
  // Test 4: Check farmers endpoint
  console.log('Test 4: Checking farmers endpoint...');
  return fetch(API_BASE + '/user/getAllFarmers?tenantId=' + tenantId, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'x-tenant-id': tenantId,
      'Content-Type': 'application/json'
    }
  });
})
.then(response => {
  console.log('   Status:', response.status);
  if (response.status === 200) {
    console.log('   ✅ Farmers endpoint works!');
  } else {
    console.log('   ❌ Farmers endpoint returned error:', response.status);
  }
  return response.json();
})
.then(data => {
  console.log('   Response:', data);
  console.log('   Data count:', data.data?.length || 0);
  console.log('');
  console.log('✅ All tests completed!');
  console.log('');
  console.log('Summary:');
  console.log('  If all endpoints return 200: Backend is working, tenant might have no data');
  console.log('  If any endpoint returns 401: Token or permission issue');
  console.log('  If any endpoint returns 404: Endpoint does not exist');
  console.log('  If any endpoint returns 500: Backend server error');
})
.catch(error => {
  console.error('❌ NETWORK ERROR:', error.message);
  console.error('');
  console.error('This means:');
  console.error('  1. Backend server is down or unreachable');
  console.error('  2. CORS is blocking the request');
  console.error('  3. Network/firewall is blocking the request');
  console.error('');
  console.error('Check:');
  console.error('  - Is backend server running?');
  console.error('  - Does backend allow CORS from your origin?');
  console.error('  - Check browser Network tab for more details');
  console.error('');
  console.error('Full error:', error);
});
