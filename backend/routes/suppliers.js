// Supplier Routes
const express = require('express');
const router = express.Router();
const { dbAll, dbGet } = require('../db/init');
const { calculateSupplierRisk } = require('../utils/bpr');

// GET /api/suppliers
router.get('/', (req, res) => {
  try {
    const suppliers = dbAll('SELECT * FROM suppliers ORDER BY name');
    const result = suppliers.map(s => ({
      ...s,
      riskScore: calculateSupplierRisk(s.delayed_deliveries, s.total_deliveries),
      riskLevel: calculateSupplierRisk(s.delayed_deliveries, s.total_deliveries) > 25 ? 'high' :
                 calculateSupplierRisk(s.delayed_deliveries, s.total_deliveries) > 15 ? 'medium' : 'low',
      reliabilityScore: 100 - calculateSupplierRisk(s.delayed_deliveries, s.total_deliveries),
      onTimeDeliveries: s.total_deliveries - s.delayed_deliveries
    }));
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/suppliers/analytics/overview
router.get('/analytics/overview', (req, res) => {
  try {
    const suppliers = dbAll("SELECT * FROM suppliers WHERE status = 'active'");
    const analytics = { totalSuppliers: suppliers.length, avgRiskScore: 0, avgLeadTime: 0, highRisk: 0, mediumRisk: 0, lowRisk: 0, totalDeliveries: 0, totalDelayed: 0 };
    suppliers.forEach(s => {
      const risk = calculateSupplierRisk(s.delayed_deliveries, s.total_deliveries);
      analytics.avgRiskScore += risk;
      analytics.avgLeadTime += s.lead_time_days;
      analytics.totalDeliveries += s.total_deliveries;
      analytics.totalDelayed += s.delayed_deliveries;
      if (risk > 25) analytics.highRisk++; else if (risk > 15) analytics.mediumRisk++; else analytics.lowRisk++;
    });
    if (suppliers.length > 0) {
      analytics.avgRiskScore = Math.round(analytics.avgRiskScore / suppliers.length * 100) / 100;
      analytics.avgLeadTime = Math.round(analytics.avgLeadTime / suppliers.length * 10) / 10;
    }
    res.json(analytics);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/suppliers/:id
router.get('/:id', (req, res) => {
  try {
    const supplier = dbGet('SELECT * FROM suppliers WHERE id = ?', [parseInt(req.params.id)]);
    if (!supplier) return res.status(404).json({ error: 'Supplier not found' });
    const riskScore = calculateSupplierRisk(supplier.delayed_deliveries, supplier.total_deliveries);
    const orders = dbAll(`SELECT o.*, p.name as product_name FROM orders o
      JOIN products p ON o.product_id = p.id WHERE o.supplier_id = ? ORDER BY o.order_date DESC LIMIT 20`, [parseInt(req.params.id)]);
    res.json({
      ...supplier, riskScore,
      riskLevel: riskScore > 25 ? 'high' : riskScore > 15 ? 'medium' : 'low',
      reliabilityScore: 100 - riskScore,
      onTimeDeliveries: supplier.total_deliveries - supplier.delayed_deliveries,
      recentOrders: orders
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
