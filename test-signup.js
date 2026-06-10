fetch('http://localhost:3000/api/auth/signup', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: 'test2@test.com', password: 'test' })
}).then(res => res.text()).then(console.log).catch(console.error);
