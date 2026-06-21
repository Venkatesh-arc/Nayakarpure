const urls = [
  'http://localhost:5173/api/health',
  'http://localhost:5000/api/health'
];

(async () => {
  for (const url of urls) {
    try {
      const res = await fetch(url);
      const text = await res.text();
      console.log(`URL: ${url}`);
      console.log('STATUS:', res.status);
      console.log('OK:', res.ok);
      console.log('BODY:', text || '<empty>');
      console.log('HEADERS:', Object.fromEntries(res.headers.entries()));
    } catch (err) {
      console.error(`ERROR ${url}:`, err.message);
    }
    console.log('---');
  }
})();