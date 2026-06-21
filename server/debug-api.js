const fetch = global.fetch;

(async () => {
  const email = `webtest${Date.now()}@example.com`;
  const tests = [
    {
      label: 'REGISTER',
      url: 'http://localhost:5000/api/auth/register',
      body: { name: 'Website Tester', email, password: 'TestPass1', phone: '9876543210' }
    },
    {
      label: 'LOGIN',
      url: 'http://localhost:5000/api/auth/login',
      body: { email, password: 'TestPass1' }
    },
    {
      label: 'CONTACT',
      url: 'http://localhost:5000/api/contact',
      body: { name: 'Website Tester', email, subject: 'Website test', message: 'Automated website test — contact form works.' }
    }
  ];

  for (const test of tests) {
    try {
      const res = await fetch(test.url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(test.body)
      });
      const text = await res.text();
      console.log(`=== ${test.label} ===`);
      console.log('STATUS:', res.status);
      console.log('BODY:', text || '<empty>');
      console.log('HEADERS:', Object.fromEntries(res.headers.entries()));
    } catch (err) {
      console.error(`ERROR ${test.label}:`, err.message);
    }
    console.log('');
  }
})();