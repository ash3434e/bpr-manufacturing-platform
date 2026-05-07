// CSV/Excel Export Routes
const express = require('express');
const router = express.Router();
const { dbAll } = require('../db/init');
const { analyzeBPR, calculateSupplierRisk, detectBottleneck } = require('../utils/bpr');

function toCSV(headers, rows) {
  const headerLine = headers.join(',');
  const dataLines = rows.map(row => headers.map(h => {
    let val = row[h] !== undefined && row[h] !== null ? String(row[h]) : '';
    if (val.includes(',') || val.includes('"') || val.includes('\n')) val = `"${val.replace(/"/g, '""')}"`;
    return val;
  }).join(','));
  return [headerLine, ...dataLines].join('\n');
}

// GET /api/export/inventory
router.get('/inventory', (req, res) => {
  try {
    const rows = dbAll(`SELECT i.*, p.name as product_name, p.sku, p.category, pl.name as plant_name
      FROM inventory i JOIN products p ON i.product_id = p.id JOIN plants pl ON i.plant_id = pl.id ORDER BY p.name`);
    const data = rows.map(r => {
      const a = analyzeBPR(r);
      return { ...r, bpr: a.bpr, zone: a.zone, available_stock: a.availableStock, days_of_stock: a.daysOfStock, needs_reorder: a.needsReorder ? 'YES' : 'NO' };
    });
    const headers = ['product_name', 'sku', 'category', 'plant_name', 'on_hand', 'incoming_orders', 'reserved_demand', 'available_stock', 'buffer_size', 'reorder_level', 'safety_stock', 'daily_consumption', 'bpr', 'zone', 'days_of_stock', 'needs_reorder'];
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=inventory_report.csv');
    res.send(toCSV(headers, data));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET /api/export/suppliers
router.get('/suppliers', (req, res) => {
  try {
    const rows = dbAll('SELECT * FROM suppliers ORDER BY name');
    const data = rows.map(r => ({
      ...r,
      risk_score: calculateSupplierRisk(r.delayed_deliveries, r.total_deliveries),
      reliability: 100 - calculateSupplierRisk(r.delayed_deliveries, r.total_deliveries),
      on_time: r.total_deliveries - r.delayed_deliveries
    }));
    const headers = ['name', 'contact_person', 'email', 'phone', 'location', 'lead_time_days', 'total_deliveries', 'on_time', 'delayed_deliveries', 'risk_score', 'reliability', 'status'];
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=suppliers_report.csv');
    res.send(toCSV(headers, data));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET /api/export/production
router.get('/production', (req, res) => {
  try {
    const rows = dbAll(`SELECT m.*, p.name as plant_name FROM machines m JOIN plants p ON m.plant_id = p.id ORDER BY m.utilization_pct DESC`);
    const data = rows.map(r => ({ ...r, is_bottleneck: detectBottleneck(r).isBottleneck ? 'YES' : 'NO' }));
    const headers = ['name', 'plant_name', 'type', 'capacity_per_hour', 'current_load', 'utilization_pct', 'status', 'is_bottleneck'];
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=production_report.csv');
    res.send(toCSV(headers, data));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET /api/export/alerts
router.get('/alerts', (req, res) => {
  try {
    const rows = dbAll(`SELECT a.*, p.name as plant_name FROM alerts a LEFT JOIN plants p ON a.plant_id = p.id ORDER BY a.created_at DESC`);
    const headers = ['type', 'severity', 'message', 'recommendation', 'plant_name', 'created_at', 'acknowledged'];
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=alerts_report.csv');
    res.send(toCSV(headers, rows));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET /api/export/orders
router.get('/orders', (req, res) => {
  try {
    const rows = dbAll(`SELECT o.*, p.name as product_name, s.name as supplier_name, pl.name as plant_name
      FROM orders o JOIN products p ON o.product_id = p.id LEFT JOIN suppliers s ON o.supplier_id = s.id LEFT JOIN plants pl ON o.plant_id = pl.id ORDER BY o.order_date DESC`);
    const headers = ['product_name', 'supplier_name', 'quantity', 'order_date', 'due_date', 'delivery_date', 'status', 'type', 'plant_name'];
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=orders_report.csv');
    res.send(toCSV(headers, rows));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET /api/export/batches
router.get('/batches', (req, res) => {
  try {
    const rows = dbAll(`SELECT b.*, p.name as product_name, s.name as supplier_name, m.name as machine_name, pl.name as plant_name
      FROM batches b JOIN products p ON b.product_id = p.id LEFT JOIN suppliers s ON b.supplier_id = s.id LEFT JOIN machines m ON b.machine_id = m.id LEFT JOIN plants pl ON b.plant_id = pl.id`);
    const headers = ['batch_number', 'lot_number', 'product_name', 'supplier_name', 'machine_name', 'operator_name', 'quantity', 'plant_name', 'production_date', 'status'];
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=traceability_report.csv');
    res.send(toCSV(headers, rows));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
