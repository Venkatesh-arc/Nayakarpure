const BASE = 'http://localhost:5000/api';

async function request(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    }
  });
  const text = await res.text();
  const data = text ? JSON.parse(text) : {};
  if (!res.ok) {
    throw new Error(`${res.status} ${data.error || JSON.stringify(data)}`);
  }
  return data;
}

(async () => {
  try {
    const email = `razopay-test-${Date.now()}@example.com`;
    const password = 'TestPass1';

    console.log('Registering test user...');
    const reg = await request('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name: 'Razorpay Test', email, password, phone: '9876543210' })
    });
    const token = reg.token;
    console.log('Registered user', reg.user.id);

    console.log('Fetching products...');
    const productRes = await request('/products', {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!productRes.products?.length) {
      throw new Error('No products available');
    }
    const productId = productRes.products[0].id;
    console.log('Product id', productId);

    console.log('Adding to cart...');
    await request('/cart', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify({ productId, quantity: 1 })
    });

    console.log('Creating Razorpay order...');
    const order = await request('/orders/create', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        paymentMethod: 'razorpay',
        shipping: {
          name: 'Razorpay Test',
          email,
          phone: '9876543210',
          address: '123 Test Street, Sample Area',
          city: 'Chennai',
          state: 'Tamil Nadu',
          pincode: '600001'
        }
      })
    });

    console.log('Order result:', order);
    console.log('Razorpay order creation succeeded.');
  } catch (err) {
    console.error('ERROR:', err.message);
    process.exit(1);
  }
})();
