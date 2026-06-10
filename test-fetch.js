fetch('http://localhost:3000/api/auth/me').then(res => res.text()).then(console.log).catch(console.error);
