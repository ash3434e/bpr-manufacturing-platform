// Emergency Actions for Red Alert Situations
const express = require('express');
const router = express.Router();
const { dbAll, dbGet, dbRun } = require('../db/init');
const { analyzeBPR, calculateSupplierRisk } = require('../utils/bpr');

// POST /api/emergency/purchase-requisition - Auto-generate purchase requisition for Red zone items
router.post('/purchase-requisition', (req, res) => {
  try {
    const { inventory_id } = req.body;
    const inv = dbGet(`SELECT i.*, p.name as product_name, p.sku, p.plant_id
      FROM inventory i JOIN products p ON i.product_id = p.id WHERE i.id = ?`, [inventory_id]);
    if (!inv) return res.status(404).json({ error: 'Inventory not found' });

    const analysis = analyzeBPR(inv);
    if (analysis.zone !== 'red' && analysis.zone !== 'yellow') {
      return res.json({ message: 'Item is not in critical zone, no emergency action needed', zone: analysis.zone });
    }

    // Calculate emergency order quantity (restock to green zone: 33% of buffer)
    const targetStock = Math.ceil(inv.buffer_size * 0.7);
    const orderQty = Math.max(0, targetStock - analysis.availableStock);

    // Find best supplier (lowest risk, active)
    const suppliers = dbAll("SELECT * FROM suppliers WHERE status = 'active' ORDER BY delayed_deliveries * 1.0 / CASE WHEN total_deliveries > 0 THEN total_deliveries ELSE 1 END ASC, lead_time_days ASC LIMIT 3");

    // Create emergency order
    const orderDate = new Date().toISOString().split('T')[0];
    const bestSupplier = suppliers[0];
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + (bestSupplier ? bestSupplier.lead_time_days : 7));

    const r = dbRun('INSERT INTO orders (product_id, supplier_id, quantity, order_date, due_date, status, type, plant_id) VALUES (?,?,?,?,?,?,?,?)',
      [inv.product_id, bestSupplier ? bestSupplier.id : null, orderQty, orderDate, dueDate.toISOString().split('T')[0], 'confirmed', 'purchase', inv.plant_id]);

    // Update incoming orders
    dbRun('UPDATE inventory SET incoming_orders = incoming_orders + ? WHERE id = ?', [orderQty, inventory_id]);

    // Log the emergency action
    if (req.user) {
      dbRun('INSERT INTO audit_log (user_id, action, entity_type, entity_id, details) VALUES (?,?,?,?,?)',
        [req.user.id, 'emergency_purchase', 'order', r.lastInsertRowid,
         JSON.stringify({ product: inv.product_name, qty: orderQty, supplier: bestSupplier?.name, reason: 'Red zone emergency' })]);
    }

    // Create resolution alert
    dbRun('INSERT INTO alerts (type, severity, message, recommendation, entity_type, entity_id, plant_id) VALUES (?,?,?,?,?,?,?)',
      ['general', 'info', `Emergency PO created: ${orderQty} units of ${inv.product_name} from ${bestSupplier?.name || 'TBD'}`,
       `Order #${r.lastInsertRowid} placed. Expected delivery: ${dueDate.toISOString().split('T')[0]}`, 'order', r.lastInsertRowid, inv.plant_id]);

    res.json({
      success: true,
      action: 'Emergency Purchase Requisition Created',
      order_id: r.lastInsertRowid,
      product: inv.product_name,
      quantity: orderQty,
      supplier: bestSupplier?.name || 'Not assigned',
      expected_delivery: dueDate.toISOString().split('T')[0],
      current_bpr: analysis.bpr,
      projected_bpr_after: Math.round(((inv.buffer_size - (analysis.availableStock + orderQty)) / inv.buffer_size) * 100 * 100) / 100
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST /api/emergency/find-alternate-supplier - Find alternate suppliers for a product
router.post('/find-alternate-supplier', (req, res) => {
  try {
    const { current_supplier_id, product_id } = req.body;
    const suppliers = dbAll("SELECT * FROM suppliers WHERE status = 'active' AND id != ? ORDER BY delayed_deliveries * 1.0 / CASE WHEN total_deliveries > 0 THEN total_deliveries ELSE 1 END ASC, lead_time_days ASC", [current_supplier_id || 0]);

    const ranked = suppliers.map((s, i) => ({
      ...s,
      rank: i + 1,
      riskScore: calculateSupplierRisk(s.delayed_deliveries, s.total_deliveries),
      reliabilityScore: 100 - calculateSupplierRisk(s.delayed_deliveries, s.total_deliveries),
      recommendation: i === 0 ? 'Best alternate — lowest risk, fastest delivery' : i < 3 ? 'Good alternate' : 'Backup option'
    }));

    res.json({ alternates: ranked, total: ranked.length });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST /api/emergency/escalate - Create escalation
router.post('/escalate', (req, res) => {
  try {
    const { alert_id, message, priority } = req.body;
    const alert = alert_id ? dbGet('SELECT * FROM alerts WHERE id=?', [alert_id]) : null;

    // Create escalation audit entry
    if (req.user) {
      dbRun('INSERT INTO audit_log (user_id, action, entity_type, entity_id, details) VALUES (?,?,?,?,?)',
        [req.user.id, 'escalation', 'alert', alert_id,
         JSON.stringify({ message, priority: priority || 'high', original_alert: alert?.message })]);
    }

    // Create escalation alert
    dbRun('INSERT INTO alerts (type, severity, message, recommendation, entity_type, entity_id, plant_id) VALUES (?,?,?,?,?,?,?)',
      ['general', 'critical', `🚨 ESCALATION: ${message || alert?.message || 'Emergency'}`,
       'This issue has been escalated to management. Track audit log for updates.', 'alert', alert_id, alert?.plant_id]);

    res.json({ success: true, message: 'Issue escalated to management', escalation_id: alert_id });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET /api/emergency/red-zone-report - Get all Red zone items with recommended actions
router.get('/red-zone-report', (req, res) => {
  try {
    const inventory = dbAll(`SELECT i.*, p.name as product_name, p.sku, p.category, pl.name as plant_name
      FROM inventory i JOIN products p ON i.product_id = p.id JOIN plants pl ON i.plant_id = pl.id`);

    const redZoneItems = inventory.map(inv => ({ ...inv, ...analyzeBPR(inv) })).filter(item => item.zone === 'red');

    const report = redZoneItems.map(item => {
      const targetStock = Math.ceil(item.buffer_size * 0.7);
      const orderQty = Math.max(0, targetStock - item.availableStock);
      const bestSupplier = dbGet("SELECT * FROM suppliers WHERE status='active' ORDER BY delayed_deliveries * 1.0 / CASE WHEN total_deliveries > 0 THEN total_deliveries ELSE 1 END ASC LIMIT 1");

      return {
        ...item,
        recommended_action: 'Emergency Purchase',
        recommended_qty: orderQty,
        recommended_supplier: bestSupplier?.name,
        estimated_delivery_days: bestSupplier?.lead_time_days,
        urgency: item.daysOfStock <= 2 ? 'CRITICAL — Stock out imminent' : item.daysOfStock <= 5 ? 'HIGH — Less than a week of stock' : 'MEDIUM — Monitor closely'
      };
    });

    res.json({ total_red_items: report.length, report });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
