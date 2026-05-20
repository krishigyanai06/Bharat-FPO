// ========================================
// COMPREHENSIVE DIAGNOSTIC SCRIPT
// Run this in browser console after login
// ========================================

console.log('\n\n🔍 ========== DIAGNOSTIC START ==========\n');

// Step 1: Check Authentication
console.log('📋 STEP 1: Authentication Check');
const token = sessionStorage.getItem('token');
const user = JSON.parse(localStorage.getItem('user') || '{}');
console.log('   Token exists:', token ? '✅ YES' : '❌ NO');
console.log('   Token length:', token?.length || 0);
console.log('   User role:', user.role);
console.log('   Is SuperAdmin:', user.role?.toLowerCase().replace(/\s+/g, '') === 'superadmin' ? '✅ YES' : '❌ NO');

// Step 2: Check Tenant Selection
console.log('\n📋 STEP 2: Tenant Selection Check');
const selectedTenantId = localStorage.getItem('selectedTenantId');
console.log('   Selected Tenant ID:', selectedTenantId || '❌ NOT SET');
console.log('   Expected MAR4UP ID:', '69fc8edf068c8a5b5626a014');
console.log('   Match:', selectedTenantId === '69fc8edf068c8a5b5626a014' ? '✅ YES' : '❌ NO');

// Step 3: Test API Endpoints
console.log('\n📋 STEP 3: Testing API Endpoints');

if (!token) {
  console.error('❌ Cannot test APIs - no token found. Please login first.');
} else if (!selectedTenantId) {
  console.error('❌ Cannot test APIs - no tenant selected.');
} else {
  console.log('   Testing with:');
  console.log('   - Token:', token.substring(0, 20) + '...');
  console.log('   - Tenant ID:', selectedTenantId);
  console.log('\n   🔄 Making API calls...\n');

  // Test 1: Get Listings
  fetch(`https://master-app-h957.onrender.com/api/sell-crop/getListings?tenantId=${selectedTenantId}`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'x-tenant-id': selectedTenantId,
      'Content-Type': 'application/json'
    }
  })
  .then(r => {
    console.log('   📦 Listings API:');
    console.log('      Status:', r.status, r.status === 200 ? '✅' : '❌');
    return r.json();
  })
  .then(data => {
    console.log('      Success:', data.success ? '✅' : '❌');
    console.log('      Data type:', Array.isArray(data.data) ? 'Array' : typeof data.data);
    console.log('      Data count:', Array.isArray(data.data) ? data.data.length : 'N/A');
    if (data.data?.length > 0) {
      console.log('      ✅ Has data! Sample:', data.data[0]);
    } else if (Array.isArray(data.data) && data.data.length === 0) {
      console.log('      ⚠️ Empty array - tenant has no listings');
    } else {
      console.log('      ❌ Unexpected format:', data);
    }
  })
  .catch(err => console.error('      ❌ Error:', err.message));

  // Test 2: Get Procurement
  setTimeout(() => {
    fetch(`https://master-app-h957.onrender.com/api/procurement/getPurchases?tenantId=${selectedTenantId}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'x-tenant-id': selectedTenantId,
        'Content-Type': 'application/json'
      }
    })
    .then(r => {
      console.log('\n   📦 Procurement API:');
      console.log('      Status:', r.status, r.status === 200 ? '✅' : '❌');
      return r.json();
    })
    .then(data => {
      console.log('      Success:', data.success ? '✅' : '❌');
      console.log('      Data type:', Array.isArray(data.data) ? 'Array' : typeof data.data);
      console.log('      Data count:', Array.isArray(data.data) ? data.data.length : 'N/A');
      if (data.data?.length > 0) {
        console.log('      ✅ Has data! Sample:', data.data[0]);
      } else if (Array.isArray(data.data) && data.data.length === 0) {
        console.log('      ⚠️ Empty array - tenant has no procurement orders');
      } else {
        console.log('      ❌ Unexpected format:', data);
      }
    })
    .catch(err => console.error('      ❌ Error:', err.message));
  }, 500);

  // Test 3: Get Farmers
  setTimeout(() => {
    fetch(`https://master-app-h957.onrender.com/api/user/getAllFarmers?tenantId=${selectedTenantId}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'x-tenant-id': selectedTenantId,
        'Content-Type': 'application/json'
      }
    })
    .then(r => {
      console.log('\n   📦 Farmers API:');
      console.log('      Status:', r.status, r.status === 200 ? '✅' : '❌');
      return r.json();
    })
    .then(data => {
      console.log('      Success:', data.success ? '✅' : '❌');
      console.log('      Data type:', Array.isArray(data.data) ? 'Array' : typeof data.data);
      console.log('      Data count:', Array.isArray(data.data) ? data.data.length : 'N/A');
      if (data.data?.length > 0) {
        console.log('      ✅ Has data! Sample:', data.data[0]);
      } else if (Array.isArray(data.data) && data.data.length === 0) {
        console.log('      ⚠️ Empty array - tenant has no farmers');
      } else {
        console.log('      ❌ Unexpected format:', data);
      }
      
      console.log('\n🔍 ========== DIAGNOSTIC END ==========\n');
      console.log('📊 SUMMARY:');
      console.log('   If all APIs return empty arrays (data.length = 0):');
      console.log('   → Tenant has no data in database');
      console.log('   → This is NOT a frontend issue');
      console.log('   → Backend needs to add data for this tenant\n');
      console.log('   If APIs return 401/403 errors:');
      console.log('   → Check token validity');
      console.log('   → Check SuperAdmin permissions\n');
      console.log('   If APIs return wrong format:');
      console.log('   → Backend response structure issue');
      console.log('   → Check backend API documentation\n');
    })
    .catch(err => console.error('      ❌ Error:', err.message));
  }, 1000);
}

console.log('\n⏳ Waiting for API responses...\n');
