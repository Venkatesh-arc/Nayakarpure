const BASE = 'http://localhost:5000/api';

async function req(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) }
  });
  const text = await res.text();
  let data = {};
  try { data = text ? JSON.parse(text) : {}; } catch { data._raw = text; }
  return { res, data };
}

async function run() {
  const email = `profiletest${Date.now()}@example.com`;
  const origPass = 'OrigPass1';
  const newPass = 'NewPass1';

  console.log('Registering...');
  let r = await req('/auth/register', { method: 'POST', body: JSON.stringify({ name: 'Profile Test', email, password: origPass, phone: '9876543210' }) });
  if (!r.res.ok) return console.error('Register failed', r.data);
  const token = r.data.token;
  console.log('Registered.');

  console.log('Request profile update (change password)...');
  r = await req('/auth/me/request-update', { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: JSON.stringify({ newPassword: newPass, currentPassword: origPass }) });
  console.log('Request-update response:', r.data);
  if (!r.res.ok) return console.error('Request-update failed', r.data);
  const otp = r.data.otp || r.data.token;
  if (!otp) return console.error('No OTP returned; cannot continue in dev');

  console.log('Confirming update with OTP:', otp);
  r = await req('/auth/me/confirm-update', { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: JSON.stringify({ token: otp }) });
  console.log('Confirm response:', r.data);
  if (!r.res.ok) return console.error('Confirm failed', r.data);

  console.log('Trying to login with new password...');
  r = await req('/auth/login', { method: 'POST', body: JSON.stringify({ email, password: newPass }) });
  console.log('Login with new password:', r.res.ok ? 'OK' : 'FAILED', r.data);
}

run().catch(e => console.error(e));
