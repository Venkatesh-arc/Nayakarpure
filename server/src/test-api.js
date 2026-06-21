const BASE = 'http://localhost:5000/api';

async function request(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...options.headers }
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || JSON.stringify(data));
  return data;
}

const email = `test${Date.now()}@example.com`;
let token;
let productId;
let cartItemId;

console.log('1. Health check...');
const health = await request('/health');
console.log('   OK:', health.status);

console.log('2. Register user...');
const reg = await request('/auth/register', {
  method: 'POST',
  body: JSON.stringify({
    name: 'Test User',
    email,
    password: 'TestPass1',
    phone: '9876543210'
  })
});
console.log('   OK: user', reg.user.id);

if (reg.needsVerification) {
  if (!reg.otp) {
    throw new Error('Registration OTP was not returned for test verification');
  }
  console.log('3. Verify registration OTP...');
  await request('/auth/verify-registration-otp', {
    method: 'POST',
    body: JSON.stringify({ email, otp: reg.otp })
  });
  console.log('   OK: OTP verified');
}

console.log('3. Login user...');
const login = await request('/auth/login', {
  method: 'POST',
  body: JSON.stringify({ email, password: 'TestPass1' })
});
token = login.token;
console.log('   OK: token received');

console.log('4. Get products...');
const { products } = await request('/products');
if (!products.length) throw new Error('No products found');
productId = products[0].id;
console.log('   OK:', products.length, 'products');

console.log('4. Add to cart...');
await request('/cart', {
  method: 'POST',
  headers: { Authorization: `Bearer ${token}` },
  body: JSON.stringify({ productId, quantity: 1 })
});
const cart = await request('/cart', { headers: { Authorization: `Bearer ${token}` } });
cartItemId = cart.items[0]?.id;
console.log('   OK: cart items', cart.items.length);

console.log('5. Place COD order...');
const order = await request('/orders/create', {
  method: 'POST',
  headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify({
      paymentMethod: 'cod',
    shipping: {
      name: 'Test User',
      email,
      phone: '9876543210',
      address: '123 Test Street, Sample Area',
      city: 'Chennai',
      state: 'Tamil Nadu',
      pincode: '600001'
    }
  })
});
console.log('   OK: order', order.orderNumber);

console.log('6. Get my orders...');
const { orders } = await request('/orders/my-orders', {
  headers: { Authorization: `Bearer ${token}` }
});
console.log('   OK:', orders.length, 'order(s)');

console.log('7. Contact form...');
await request('/contact', {
  method: 'POST',
  body: JSON.stringify({
    name: 'Test User',
    email,
    subject: 'Test message',
    message: 'This is an automated API test message.'
  })
});
console.log('   OK');

console.log('\nAll API tests passed.');
