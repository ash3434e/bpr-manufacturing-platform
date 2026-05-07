// Inventory Routes
const express = require('express');
const router = express.Router();
const { dbAll, dbGet, dbRun } = require('../db/init');
const { analyzeBPR } = require('../utils/bpr');

// GET /api/inventory
router.get('/', (req, res) => {
  try {
    const { plant_id, zone, category } = req.query;
    let query = `SELECT i.*, p.name as product_name, p.sku, p.category, p.unit, pl.name as plant_name
      FROM inventory i JOIN products p ON i.product_id = p.id JOIN plants pl ON i.plant_id = pl.id WHERE 1=1`;
    const params = [];
    if (plant_id) { query += ' AND i.plant_id = ?'; params.push(parseInt(plant_id)); }
    if (category) { query += ' AND p.category = ?'; params.push(category); }
    query += ' ORDER BY p.name';

    const rows = dbAll(query, params);
    let result = rows.map(inv => ({ ...inv, ...analyzeBPR(inv) }));
    if (zone) result = result.filter(item => item.zone === zone);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/inventory/categories/list
router.get('/categories/list', (req, res) => {
  try {
    const categories = dbAll('SELECT DISTINCT category FROM products WHERE category IS NOT NULL ORDER BY category');
    res.json(categories.map(c => c.category));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/inventory/:id
router.get('/:id', (req, res) => {
  try {
    const inv = dbGet(`SELECT i.*, p.name as product_name, p.sku, p.category, p.unit, pl.name as plant_name
      FROM inventory i JOIN products p ON i.product_id = p.id JOIN plants pl ON i.plant_id = pl.id WHERE i.id = ?`, [parseInt(req.params.id)]);
    if (!inv) return res.status(404).json({ error: 'Inventory item not found' });
    const orders = dbAll(`SELECT o.*, s.name as supplier_name FROM orders o LEFT JOIN suppliers s ON o.supplier_id = s.id
      WHERE o.product_id = ? ORDER BY o.order_date DESC LIMIT 10`, [inv.product_id]);
    res.json({ ...inv, ...analyzeBPR(inv), recentOrders: orders });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/inventory/:id
router.put('/:id', (req, res) => {
  try {
    const { on_hand, incoming_orders, reserved_demand, buffer_size, reorder_level, safety_stock, daily_consumption } = req.body;
    dbRun(`UPDATE inventory SET on_hand=?, incoming_orders=?, reserved_demand=?, buffer_size=?,
      reorder_level=?, safety_stock=?, daily_consumption=?, last_updated=CURRENT_TIMESTAMP WHERE id=?`,
      [on_hand, incoming_orders, reserved_demand, buffer_size, reorder_level, safety_stock, daily_consumption, parseInt(req.params.id)]);
    if (req.user) {
      dbRun('INSERT INTO audit_log (user_id, action, entity_type, entity_id, details) VALUES (?,?,?,?,?)',
        [req.user.id, 'update', 'inventory', parseInt(req.params.id), JSON.stringify(req.body)]);
    }
    const updated = dbGet('SELECT * FROM inventory WHERE id = ?', [parseInt(req.params.id)]);
    res.json({ ...updated, ...analyzeBPR(updated) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
