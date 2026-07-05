const API = process.env.API_URL || 'http://localhost:5001/api';

const ok = (cond, msg) => {
  if (!cond) {
    console.error('FAIL:', msg);
    process.exitCode = 2;
  } else {
    console.log('OK:', msg);
  }
};

const run = async () => {
  console.log('Running smoke tests against', API);

  // 1) GET /products
  try {
    const r = await fetch(`${API}/products`);
    let products;
    try { products = await r.json(); } catch (e) { products = null; }
    ok([200,401].includes(r.status), `/products returned 200 or 401 (status=${r.status})`);
    if (r.status === 200) {
      ok(Array.isArray(products), `/products returned array (type=${typeof products})`);
      if (products && products.length > 0) {
        ok(!('neto_1' in products[0]), 'products do not expose neto_1 to anonymous');
      }
    } else {
      console.log('/products requires authentication; skipping payload checks');
    }
    if (r.status !== 200 || !Array.isArray(products)) {
      console.error('Response /products:', r.status, products);
    }
  } catch (err) {
    console.error('Error fetching /products', err.message);
    process.exitCode = 2;
  }

  // 2) POST /reservations (create temp) - anonymous may be allowed depending on auth; we try and expect 401 or 400 or 201
  try {
    const payload = { product_id: 1, contacto_nombre: 'Smoke', contacto_email: 'smoke@example.com', pedido_id: 'SMOKE1' };
    const r = await fetch(`${API}/reservations`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    ok([200,201,400,401,403,404].includes(r.status), `/reservations POST returned expected status (${r.status})`);
    if (r.status === 201) {
      const res = await r.json();
      ok(!('neto_1' in res), 'reservation creation response does not expose neto_1 to anonymous');
    }
    if (![200,201,400,401,403,404].includes(r.status)) {
      try { const body = await r.text(); console.error('/reservations body:', body); } catch(_) {}
    }
  } catch (err) {
    console.error('Error POST /reservations', err.message);
    process.exitCode = 2;
  }

  // 3) GET /themes
  try {
    const r = await fetch(`${API}/themes`);
    let themes;
    try { themes = await r.json(); } catch (_) { themes = null; }
    ok([200,401].includes(r.status), `/themes returned 200 or 401 (status=${r.status})`);
    if (r.status === 200) {
      ok(Array.isArray(themes), `/themes returned array (type=${typeof themes})`);
    } else {
      console.log('/themes requires authentication; skipping payload checks');
    }
  } catch (err) {
    console.error('Error fetching /themes', err.message);
    process.exitCode = 2;
  }

  if (process.exitCode === 0 || process.exitCode === undefined) {
    console.log('Smoke tests completed.');
  } else {
    console.error('Smoke tests detected failures.');
    process.exitCode = process.exitCode || 2;
  }
};

run();
