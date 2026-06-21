const SITE = 'http://localhost:5173';
const API = `${SITE}/api`;

let passed = 0;
let failed = 0;

function ok(label) {
  passed++;
  console.log(`  ✓ ${label}`);
}

function fail(label, err) {
  failed++;
  console.log(`  ✗ ${label}: ${err}`);
}

async function request(url, options = {}) {
  const res = await fetch(url, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...options.headers }
  });
  const text = await res.text();
  let data;
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { _raw: text };
  }
  return { res, data };
}

console.log('\n=== Nayakar Pure Website Tests ===\n');

// 1. Frontend pages load
console.log('Frontend pages');
for (const path of ['/', '/shop', '/about', '/contact', '/login', '/orders']) {
  try {
    const res = await fetch(`${SITE}${path}`);
    const html = await res.text();
    if (res.status !== 200) throw new Error(`status ${res.status}`);
    if (!html.includes('<div id="root">')) throw new Error('missing React root');
    ok(`${path} loads`);
  } catch (err) {
    fail(`${path} loads`, err.message);
  }
}

// 2. Static assets
console.log('\nStatic assets');
for (const asset of ['/images/logo.png', '/images/banner.png']) {
  try {
    const res = await fetch(`${SITE}${asset}`);
    if (!res.ok) throw new Error(`status ${res.status}`);
    ok(asset);
  } catch (err) {
    fail(asset, err.message);
  }
}

// 3. API via Vite proxy
console.log('\nAPI (through site proxy)');
try {
  const { res, data } = await request(`${API}/health`);
  if (!res.ok || data.status !== 'ok') throw new Error(JSON.stringify(data));
  ok('/api/health');
} catch (err) {
  fail('/api/health', err.message);
}

let products = [];
try {
  const { res, data } = await request(`${API}/products`);
  if (!res.ok || !data.products?.length) throw new Error('no products');
  products = data.products;
  ok(`/api/products (${products.length} items)`);
} catch (err) {
  fail('/api/products', err.message);
}

try {
  const { res, data } = await request(`${API}/products/categories`);
  if (!res.ok || !data.categories?.length) throw new Error('no categories');
  ok(`/api/products/categories (${data.categories.length})`);
} catch (err) {
  fail('/api/products/categories', err.message);
}

if (products.length) {
  try {
    const { res, data } = await request(`${API}/products/${products[0].id}`);
    if (!res.ok || !data.product) throw new Error(JSON.stringify(data));
    ok('/api/products/:id');
  } catch (err) {
    fail('/api/products/:id', err.message);
  }
}

// 4. Full shopping flow
console.log('\nShopping flow');
const email = `webtest${Date.now()}@example.com`;
let token;
let productId = products[0]?.id;

try {
  const { res, data } = await request(`${API}/auth/register`, {
    method: 'POST',
    body: JSON.stringify({
      name: 'Website Tester',
      email,
      password: 'TestPass1',
      phone: '9876543210'
    })
  });
  if (!res.ok || !data.token) throw new Error(JSON.stringify(data));
  token = data.token;
  ok('Register');
} catch (err) {
  fail('Register', err.message);
}

const auth = { Authorization: `Bearer ${token}` };

try {
  const { res, data } = await request(`${API}/auth/me`, { headers: auth });
  if (!res.ok || data.user?.email !== email) throw new Error(JSON.stringify(data));
  ok('Login session (/auth/me)');
} catch (err) {
  fail('Login session', err.message);
}

if (token && productId) {
  try {
    const { res } = await request(`${API}/cart`, {
      method: 'POST',
      headers: auth,
      body: JSON.stringify({ productId, quantity: 2 })
    });
    if (!res.ok) throw new Error(`status ${res.status}`);
    ok('Add to cart');
  } catch (err) {
    fail('Add to cart', err.message);
  }

  try {
    const { res, data } = await request(`${API}/cart`, { headers: auth });
    if (!res.ok || !data.items?.length) throw new Error('empty cart');
    ok(`View cart (${data.items.length} item, ₹${data.subtotal})`);
  } catch (err) {
    fail('View cart', err.message);
  }

  let orderId;
  try {
    const { res, data } = await request(`${API}/orders/create`, {
      method: 'POST',
      headers: auth,
      body: JSON.stringify({
        paymentMethod: 'cod',
        shipping: {
          name: 'Website Tester',
          email,
          phone: '9876543210',
          address: '42 Test Lane, Green Park Area',
          city: 'Chennai',
          state: 'Tamil Nadu',
          pincode: '600001'
        }
      })
    });
    if (!res.ok || !data.orderNumber) throw new Error(JSON.stringify(data));
    orderId = data.orderId;
    ok(`Place order (${data.orderNumber})`);
  } catch (err) {
    fail('Place order', err.message);
  }

  try {
    const { res, data } = await request(`${API}/orders/my-orders`, { headers: auth });
    if (!res.ok || !data.orders?.length) throw new Error('no orders');
    orderId = orderId || data.orders[0].id;
    ok(`Order history (${data.orders.length} order)`);
  } catch (err) {
    fail('Order history', err.message);
  }

  if (orderId) {
    try {
      const { res, data } = await request(`${API}/orders/${orderId}/tracking`, { headers: auth });
      if (!res.ok || !data.tracking?.steps?.length) throw new Error(JSON.stringify(data));
      ok('Order tracking');
    } catch (err) {
      fail('Order tracking', err.message);
    }

    try {
      const { res, data } = await request(`${API}/orders/${orderId}/invoice`, { headers: auth });
      if (!res.ok || !data.invoice?.invoiceNumber) throw new Error(JSON.stringify(data));
      ok(`Invoice (${data.invoice.invoiceNumber})`);
    } catch (err) {
      fail('Invoice', err.message);
    }

    try {
      const { res, data } = await request(`${API}/orders/${orderId}/cancel`, {
        method: 'POST',
        headers: auth
      });
      if (!res.ok || data.order?.status !== 'cancelled') throw new Error(JSON.stringify(data));
      ok('Cancel order');
    } catch (err) {
      fail('Cancel order', err.message);
    }
  }
}

// 5. Contact form
console.log('\nContact form');
try {
  const { res, data } = await request(`${API}/contact`, {
    method: 'POST',
    body: JSON.stringify({
      name: 'Website Tester',
      email,
      subject: 'Website test',
      message: 'Automated website test — contact form works.'
    })
  });
  if (!res.ok) throw new Error(JSON.stringify(data));
  ok('Submit contact form');
} catch (err) {
  fail('Submit contact form', err.message);
}

// Summary
console.log('\n=== Results ===');
console.log(`Passed: ${passed}`);
console.log(`Failed: ${failed}`);
console.log(failed === 0 ? '\nAll website tests passed.\n' : '\nSome tests failed.\n');
process.exit(failed > 0 ? 1 : 0);
