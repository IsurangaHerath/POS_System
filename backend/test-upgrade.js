/**
 * Integration smoke test for v2 upgrade features.
 * Run: node test-upgrade.js  (from backend/)
 */
require('dotenv').config();
const app = require('./src/app');
const database = require('./src/config/database');
const BASE = 'http://127.0.0.1:3999/api';
let token = null, customerId = null, productId = null, saleId = null, registerId = null;

async function api(method, path, body, auth = true) {
    const headers = { 'Content-Type': 'application/json' };
    if (auth && token) headers.Authorization = `Bearer ${token}`;
    const res = await fetch(BASE + path, { method, headers, body: body ? JSON.stringify(body) : undefined });
    return { status: res.status, json: await res.json().catch(() => ({})) };
}
function check(name, cond, extra) {
    if (!cond) { console.error(`\u2717 ${name}`, extra || ''); process.exit(1); }
    console.log(`\u2713 ${name}`);
}
const uniq = Date.now();

(async () => {
    await database.testConnection();
    const server = app.listen(3999, async () => {

        let r = await api('POST', '/auth/register', {
            username: `tester${uniq}`, email: `tester${uniq}@t.com`,
            password: 'password123', full_name: 'Test User', role: 'admin'
        }, false);
        check('register', r.status < 400, JSON.stringify(r.json));

        // Promote the self-registered test user to admin so we can test admin-only flows.
        await database.query("UPDATE users SET role='admin' WHERE username=?", [`tester${uniq}`]);

        r = await api('POST', '/auth/login', { username: `tester${uniq}`, password: 'password123' }, false);
        token = r.json.data && r.json.data.tokens && r.json.data.tokens.accessToken;
        check('login (token)', !!token, JSON.stringify(r.json));

        r = await api('GET', '/products?limit=1');
        if (r.json.data && r.json.data.length) {
            productId = r.json.data[0].id;
        } else {
            r = await api('POST', '/products', { name: 'Test Product', sku: 'SKU' + uniq, selling_price: 1000 });
            productId = r.json.data.id;
        }
        check('product ready', !!productId);

        r = await api('POST', '/customers', { name: 'Kamal Perera', phone: '0771234567', credit_limit: 50000 });
        check('create customer', r.status === 201, JSON.stringify(r.json));
        customerId = r.json.data.id;

        r = await api('POST', '/sales', {
            items: [{ product_id: productId, quantity: 1 }], payment_method: 'mixed',
            payments: [{ method: 'cash', amount: 600 }, { method: 'card', amount: 400 }],
            customer_id: customerId
        });
        check('cash+mixed sale', r.status === 201, JSON.stringify(r.json));
        saleId = r.json.data.id;

        r = await api('POST', '/sales', {
            items: [{ product_id: productId, quantity: 1 }], payment_method: 'credit', customer_id: customerId
        });
        check('credit sale', r.status === 201, JSON.stringify(r.json));

        r = await api('GET', `/customers/${customerId}/statement`);
        check('credit statement + balance>0', r.status === 200 && Number(r.json.data.current_balance) > 0, JSON.stringify(r.json));

        r = await api('POST', `/customers/${customerId}/payments`, { amount: 500, method: 'cash' });
        check('credit payment', r.status === 200, JSON.stringify(r.json));

        r = await api('POST', '/returns', {
            sale_id: saleId, return_type: 'full', refund_method: 'cash',
            items: [{ product_id: productId, quantity: 1, unit_price: 1000 }]
        });
        check('create return', r.status === 201, JSON.stringify(r.json));

        r = await api('POST', '/cash-registers/open', { opening_cash: 5000 });
        check('open cash register', r.status === 201, JSON.stringify(r.json));
        registerId = r.json.data.id;

        r = await api('POST', `/cash-registers/${registerId}/close`, { actual_cash: 5000 });
        check('close register (variance)', r.status === 200 && r.json.data.variance !== undefined, JSON.stringify(r.json));

        r = await api('POST', '/expenses', {
            amount: 1500, expense_date: new Date().toISOString().slice(0, 10),
            description: 'Electricity', payment_method: 'cash'
        });
        check('create expense', r.status === 201, JSON.stringify(r.json));

        r = await api('POST', '/held-bills', { cart: [{ product_id: productId, quantity: 2 }] });
        check('hold bill', r.status === 201, JSON.stringify(r.json));
        r = await api('DELETE', `/held-bills/${r.json.data.id}`);
        check('delete held bill', r.status === 200, JSON.stringify(r.json));

        console.log('\nALL SMOKE TESTS PASSED');
        server.close(() => process.exit(0));
    });
    server.on('error', (e) => { console.error('Server error', e.message); process.exit(1); });
})();