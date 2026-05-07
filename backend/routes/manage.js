// CRUD Management Routes - Full create/edit/delete for products, suppliers, machines, orders, users
const express = require('express');
const router = express.Router();
const { dbAll, dbGet, dbRun } = require('../db/init');
const bcrypt = require('bcryptjs');

// ==================== PRODUCTS ====================
router.get('/products', (req, res) => {
  try {
    res.json(dbAll('SELECT p.*, pl.name as plant_name FROM products p LEFT JOIN plants pl ON p.plant_id = pl.id ORDER BY p.name'));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/products', (req, res) => {
  try {
    const { name, sku, category, unit, plant_id } = req.body;
    if (!name) return res.status(400).json({ error: 'Product name required' });
    const r = dbRun('INSERT INTO products (name, sku, category, unit, plant_id) VALUES (?,?,?,?,?)', [name, sku, category, unit || 'pcs', plant_id]);
    // Auto-create inventory entry
    if (plant_id) {
      dbRun('INSERT INTO inventory (product_id, plant_id, on_hand, incoming_orders, reserved_demand, buffer_size, reorder_level, safety_stock, daily_consumption) VALUES (?,?,0,0,0,100,30,20,5)', [r.lastInsertRowid, plant_id]);
    }
    if (req.user) dbRun('INSERT INTO audit_log (user_id, action, entity_type, entity_id, details) VALUES (?,?,?,?,?)', [req.user.id, 'create', 'product', r.lastInsertRowid, JSON.stringify(req.body)]);
    res.json({ id: r.lastInsertRowid, ...req.body });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.put('/products/:id', (req, res) => {
  try {
    const { name, sku, category, unit, plant_id } = req.body;
    dbRun('UPDATE products SET name=?, sku=?, category=?, unit=?, plant_id=? WHERE id=?', [name, sku, category, unit, plant_id, parseInt(req.params.id)]);
    if (req.user) dbRun('INSERT INTO audit_log (user_id, action, entity_type, entity_id, details) VALUES (?,?,?,?,?)', [req.user.id, 'update', 'product', parseInt(req.params.id), JSON.stringify(req.body)]);
    res.json(dbGet('SELECT * FROM products WHERE id=?', [parseInt(req.params.id)]));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.delete('/products/:id', (req, res) => {
  try {
    dbRun('DELETE FROM products WHERE id=?', [parseInt(req.params.id)]);
    if (req.user) dbRun('INSERT INTO audit_log (user_id, action, entity_type, entity_id) VALUES (?,?,?,?)', [req.user.id, 'delete', 'product', parseInt(req.params.id)]);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ==================== SUPPLIERS ====================
router.post('/suppliers', (req, res) => {
  try {
    const { name, contact_person, email, phone, location, lead_time_days, status } = req.body;
    if (!name) return res.status(400).json({ error: 'Supplier name required' });
    const r = dbRun('INSERT INTO suppliers (name, contact_person, email, phone, location, lead_time_days, total_deliveries, delayed_deliveries, status) VALUES (?,?,?,?,?,?,0,0,?)', [name, contact_person, email, phone, location, lead_time_days || 7, status || 'active']);
    if (req.user) dbRun('INSERT INTO audit_log (user_id, action, entity_type, entity_id, details) VALUES (?,?,?,?,?)', [req.user.id, 'create', 'supplier', r.lastInsertRowid, JSON.stringify(req.body)]);
    res.json({ id: r.lastInsertRowid, ...req.body });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.put('/suppliers/:id', (req, res) => {
  try {
    const { name, contact_person, email, phone, location, lead_time_days, status } = req.body;
    dbRun('UPDATE suppliers SET name=?, contact_person=?, email=?, phone=?, location=?, lead_time_days=?, status=? WHERE id=?', [name, contact_person, email, phone, location, lead_time_days, status, parseInt(req.params.id)]);
    if (req.user) dbRun('INSERT INTO audit_log (user_id, action, entity_type, entity_id, details) VALUES (?,?,?,?,?)', [req.user.id, 'update', 'supplier', parseInt(req.params.id), JSON.stringify(req.body)]);
    res.json(dbGet('SELECT * FROM suppliers WHERE id=?', [parseInt(req.params.id)]));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.delete('/suppliers/:id', (req, res) => {
  try {
    dbRun('DELETE FROM suppliers WHERE id=?', [parseInt(req.params.id)]);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ==================== MACHINES ====================
router.post('/machines', (req, res) => {
  try {
    const { name, plant_id, type, capacity_per_hour, status } = req.body;
    if (!name || !plant_id) return res.status(400).json({ error: 'Machine name and plant required' });
    const r = dbRun('INSERT INTO machines (name, plant_id, type, capacity_per_hour, current_load, status, utilization_pct) VALUES (?,?,?,?,0,?,0)', [name, plant_id, type, capacity_per_hour || 100, status || 'idle']);
    res.json({ id: r.lastInsertRowid, ...req.body });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.put('/machines/:id', (req, res) => {
  try {
    const { name, type, capacity_per_hour, current_load, status, utilization_pct } = req.body;
    dbRun('UPDATE machines SET name=?, type=?, capacity_per_hour=?, current_load=?, status=?, utilization_pct=? WHERE id=?', [name, type, capacity_per_hour, current_load, status, utilization_pct, parseInt(req.params.id)]);
    res.json(dbGet('SELECT * FROM machines WHERE id=?', [parseInt(req.params.id)]));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ==================== ORDERS ====================
router.get('/orders', (req, res) => {
  try {
    const { plant_id, status, type } = req.query;
    let q = `SELECT o.*, p.name as product_name, p.sku, s.name as supplier_name, pl.name as plant_name
      FROM orders o JOIN products p ON o.product_id = p.id LEFT JOIN suppliers s ON o.supplier_id = s.id LEFT JOIN plants pl ON o.plant_id = pl.id WHERE 1=1`;
    const params = [];
    if (plant_id) { q += ' AND o.plant_id=?'; params.push(parseInt(plant_id)); }
    if (status) { q += ' AND o.status=?'; params.push(status); }
    if (type) { q += ' AND o.type=?'; params.push(type); }
    q += ' ORDER BY o.order_date DESC';
    res.json(dbAll(q, params));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/orders', (req, res) => {
  try {
    const { product_id, supplier_id, quantity, order_date, due_date, status, type, plant_id } = req.body;
    if (!product_id || !quantity) return res.status(400).json({ error: 'Product and quantity required' });
    const date = order_date || new Date().toISOString().split('T')[0];
    const r = dbRun('INSERT INTO orders (product_id, supplier_id, quantity, order_date, due_date, status, type, plant_id) VALUES (?,?,?,?,?,?,?,?)',
      [product_id, supplier_id || null, quantity, date, due_date || null, status || 'pending', type || 'purchase', plant_id]);
    // Update inventory incoming
    if (type !== 'sales') {
      const inv = dbGet('SELECT * FROM inventory WHERE product_id=? AND plant_id=?', [product_id, plant_id]);
      if (inv) dbRun('UPDATE inventory SET incoming_orders = incoming_orders + ? WHERE id=?', [quantity, inv.id]);
    } else {
      const inv = dbGet('SELECT * FROM inventory WHERE product_id=? AND plant_id=?', [product_id, plant_id]);
      if (inv) dbRun('UPDATE inventory SET reserved_demand = reserved_demand + ? WHERE id=?', [quantity, inv.id]);
    }
    if (req.user) dbRun('INSERT INTO audit_log (user_id, action, entity_type, entity_id, details) VALUES (?,?,?,?,?)', [req.user.id, 'create', 'order', r.lastInsertRowid, JSON.stringify(req.body)]);
    res.json({ id: r.lastInsertRowid, message: 'Order created', ...req.body });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.put('/orders/:id/status', (req, res) => {
  try {
    const { status } = req.body;
    dbRun('UPDATE orders SET status=? WHERE id=?', [status, parseInt(req.params.id)]);
    if (status === 'delivered') {
      const order = dbGet('SELECT * FROM orders WHERE id=?', [parseInt(req.params.id)]);
      if (order) {
        dbRun('UPDATE orders SET delivery_date=? WHERE id=?', [new Date().toISOString().split('T')[0], order.id]);
        const inv = dbGet('SELECT * FROM inventory WHERE product_id=? AND plant_id=?', [order.product_id, order.plant_id]);
        if (inv) {
          dbRun('UPDATE inventory SET on_hand = on_hand + ?, incoming_orders = MAX(0, incoming_orders - ?) WHERE id=?', [order.quantity, order.quantity, inv.id]);
        }
      }
    }
    res.json(dbGet('SELECT * FROM orders WHERE id=?', [parseInt(req.params.id)]));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ==================== USERS (admin only) ====================
router.post('/users', (req, res) => {
  try {
    const { username, password, full_name, role, plant_id, email } = req.body;
    if (!username || !password) return res.status(400).json({ error: 'Username and password required' });
    const hash = bcrypt.hashSync(password, 10);
    const r = dbRun('INSERT INTO users (username, password_hash, full_name, role, plant_id, email) VALUES (?,?,?,?,?,?)', [username, hash, full_name, role || 'warehouse_team', plant_id, email]);
    res.json({ id: r.lastInsertRowid, username, full_name, role });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.put('/users/:id', (req, res) => {
  try {
    const { full_name, role, plant_id, email, is_active } = req.body;
    dbRun('UPDATE users SET full_name=?, role=?, plant_id=?, email=?, is_active=? WHERE id=?', [full_name, role, plant_id, email, is_active !== undefined ? is_active : 1, parseInt(req.params.id)]);
    res.json(dbGet('SELECT id, username, full_name, role, plant_id, email, is_active FROM users WHERE id=?', [parseInt(req.params.id)]));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ==================== INVENTORY ADJUSTMENT ====================
router.post('/inventory/adjust', (req, res) => {
  try {
    const { inventory_id, field, amount, reason } = req.body;
    if (!inventory_id || !field || amount === undefined) return res.status(400).json({ error: 'inventory_id, field, and amount required' });
    const allowed = ['on_hand', 'incoming_orders', 'reserved_demand', 'buffer_size', 'reorder_level', 'safety_stock', 'daily_consumption'];
    if (!allowed.includes(field)) return res.status(400).json({ error: 'Invalid field' });
    dbRun(`UPDATE inventory SET ${field} = ?, last_updated = CURRENT_TIMESTAMP WHERE id = ?`, [amount, inventory_id]);
    if (req.user) dbRun('INSERT INTO audit_log (user_id, action, entity_type, entity_id, details) VALUES (?,?,?,?,?)', [req.user.id, 'adjust', 'inventory', inventory_id, JSON.stringify({ field, amount, reason })]);
    res.json(dbGet('SELECT * FROM inventory WHERE id=?', [inventory_id]));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ==================== PLANTS ====================
router.post('/plants', (req, res) => {
  try {
    const { name, location, type } = req.body;
    const r = dbRun('INSERT INTO plants (name, location, type) VALUES (?,?,?)', [name, location, type || 'factory']);
    res.json({ id: r.lastInsertRowid, ...req.body });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
