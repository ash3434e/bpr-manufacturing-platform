// Traceability Routes
const express = require('express');
const router = express.Router();
const { dbAll, dbGet } = require('../db/init');

// GET /api/traceability/search
router.get('/search', (req, res) => {
  try {
    const { q } = req.query;
    if (!q) return res.status(400).json({ error: 'Search query required' });
    const batches = dbAll(`SELECT b.*, p.name as product_name, p.sku, s.name as supplier_name,
      m.name as machine_name, pl.name as plant_name FROM batches b
      JOIN products p ON b.product_id = p.id LEFT JOIN suppliers s ON b.supplier_id = s.id
      LEFT JOIN machines m ON b.machine_id = m.id LEFT JOIN plants pl ON b.plant_id = pl.id
      WHERE b.batch_number LIKE ? OR b.lot_number LIKE ? ORDER BY b.created_at DESC`, [`%${q}%`, `%${q}%`]);
    res.json(batches);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/traceability
router.get('/', (req, res) => {
  try {
    const { product_id, supplier_id, plant_id, status } = req.query;
    let query = `SELECT b.*, p.name as product_name, p.sku, s.name as supplier_name,
      m.name as machine_name, pl.name as plant_name FROM batches b
      JOIN products p ON b.product_id = p.id LEFT JOIN suppliers s ON b.supplier_id = s.id
      LEFT JOIN machines m ON b.machine_id = m.id LEFT JOIN plants pl ON b.plant_id = pl.id WHERE 1=1`;
    const params = [];
    if (product_id) { query += ' AND b.product_id = ?'; params.push(parseInt(product_id)); }
    if (supplier_id) { query += ' AND b.supplier_id = ?'; params.push(parseInt(supplier_id)); }
    if (plant_id) { query += ' AND b.plant_id = ?'; params.push(parseInt(plant_id)); }
    if (status) { query += ' AND b.status = ?'; params.push(status); }
    query += ' ORDER BY b.created_at DESC';
    res.json(dbAll(query, params));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/traceability/:id
router.get('/:id', (req, res) => {
  try {
    const batch = dbGet(`SELECT b.*, p.name as product_name, p.sku, s.name as supplier_name,
      m.name as machine_name, pl.name as plant_name, s.location as supplier_location
      FROM batches b JOIN products p ON b.product_id = p.id LEFT JOIN suppliers s ON b.supplier_id = s.id
      LEFT JOIN machines m ON b.machine_id = m.id LEFT JOIN plants pl ON b.plant_id = pl.id WHERE b.id = ?`, [parseInt(req.params.id)]);
    if (!batch) return res.status(404).json({ error: 'Batch not found' });
    const chain = {
      supplier: batch.supplier_name ? { name: batch.supplier_name, location: batch.supplier_location } : null,
      rawMaterial: { batch_number: batch.batch_number, lot_number: batch.lot_number, received_date: batch.production_date },
      production: { machine: batch.machine_name, operator: batch.operator_name, plant: batch.plant_name, quantity: batch.quantity },
      product: { name: batch.product_name, sku: batch.sku }
    };
    res.json({ batch, chain });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
