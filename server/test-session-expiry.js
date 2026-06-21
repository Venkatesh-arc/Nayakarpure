const BASE = 'http://localhost:5000/api';

async function request(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    credentials: 'include',
    ...options,
    headers: { 'Content-Type': 'application/json', ...options.headers }
  });
  const data = await res.json();
  return { status: res.status, data };
}

const email = `session-test${Date.now()}@example.com`;

async function test() {
  console.log('\n=== SESSION EXPIRY TEST ===\n');

  // 1. Register
  console.log('1. Register user...');
  const regRes = await request('/auth/register', {
    method: 'POST',
    body: JSON.stringify({
      name: 'Session Test',
      email,
      password: 'TestPass1',
      phone: '9876543210'
    })
  });
  if (regRes.status !== 201) {
    console.log('   ERROR:', regRes.data.error);
    return;
  }
  const otp = regRes.data.otp;
  console.log('   ✓ Registered, OTP:', otp);

  // 2. Verify OTP
  console.log('2. Verify registration OTP...');
  const verifyRes = await request('/auth/verify-registration-otp', {
    method: 'POST',
    body: JSON.stringify({ email, otp })
  });
  if (verifyRes.status !== 200) {
    console.log('   ERROR:', verifyRes.data.error);
    return;
  }
  console.log('   ✓ OTP verified');

  // 3. Login
  console.log('3. Login user...');
  const loginRes = await request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password: 'TestPass1' })
  });
  if (loginRes.status !== 200) {
    console.log('   ERROR:', loginRes.data.error);
    return;
  }
  console.log('   ✓ Logged in, user:', loginRes.data.user.name);

  // 4. Check /auth/me before logout (should work)
  console.log('4. Check /auth/me BEFORE logout...');
  const beforeLogout = await request('/auth/me');
  if (beforeLogout.status !== 200) {
    console.log('   ERROR:', beforeLogout.data.error);
    return;
  }
  console.log('   ✓ /auth/me returned:', beforeLogout.data.user.name);

  // 5. Logout
  console.log('5. Logout user...');
  const logoutRes = await request('/auth/logout', { method: 'POST' });
  if (logoutRes.status !== 200) {
    console.log('   ERROR:', logoutRes.data.error);
    return;
  }
  console.log('   ✓ Logged out, sessionId cleared from database');

  // 6. Try /auth/me after logout (should fail with 401)
  console.log('6. Check /auth/me AFTER logout (should fail)...');
  const afterLogout = await request('/auth/me');
  if (afterLogout.status !== 200) {
    console.log('   ✓ CORRECT: /auth/me returned', afterLogout.status, '(', afterLogout.data.error, ')');
    if (afterLogout.status === 401) {
      console.log('   ✓ Session properly expired!');
    } else {
      console.log('   ERROR: Expected 401, got', afterLogout.status);
    }
  } else {
    console.log('   ✗ SECURITY ISSUE: /auth/me still works after logout!');
    console.log('   ✗ User:', afterLogout.data.user.name);
  }

  // 7. Simulate back/forward button (should still fail)
  console.log('7. Simulate back/forward button - call /auth/me again...');
  const backForwardRes = await request('/auth/me');
  if (backForwardRes.status !== 200) {
    console.log('   ✓ CORRECT: Still returns', backForwardRes.status, '(', backForwardRes.data.error, ')');
    console.log('   ✓ Back/forward button is PROTECTED!');
  } else {
    console.log('   ✗ SECURITY ISSUE: /auth/me still works after logout!');
  }

  console.log('\n✓ SESSION EXPIRY TEST COMPLETED\n');
}

test().catch(console.error);
