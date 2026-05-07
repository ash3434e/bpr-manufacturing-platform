// Dashboard Routes
const express = require('express');
const router = express.Router();
const { dbAll, dbGet } = require('../db/init');
const { analyzeBPR, detectBottleneck, calculateSupplierRisk } = require('../utils/bpr');

// GET /api/dashboard
router.get('/', (req, res) => {
  try {
    const plantFilter = req.query.plant_id ? parseInt(req.query.plant_id) : null;

    const productCount = plantFilter
      ? dbGet('SELECT COUNT(*) as count FROM products WHERE plant_id = ?', [plantFilter])
      : dbGet('SELECT COUNT(*) as count FROM products');

    let inventoryRows;
    if (plantFilter) {
      inventoryRows = dbAll(`SELECT i.*, p.name as product_name, p.sku, p.category, pl.name as plant_name
        FROM inventory i JOIN products p ON i.product_id = p.id JOIN plants pl ON i.plant_id = pl.id
        WHERE i.plant_id = ?`, [plantFilter]);
    } else {
      inventoryRows = dbAll(`SELECT i.*, p.name as product_name, p.sku, p.category, pl.name as plant_name
        FROM inventory i JOIN products p ON i.product_id = p.id JOIN plants pl ON i.plant_id = pl.id`);
    }

    const bprAnalysis = inventoryRows.map(inv => ({ ...inv, ...analyzeBPR(inv) }));

    const zoneSummary = { green: 0, yellow: 0, red: 0, total: bprAnalysis.length };
    bprAnalysis.forEach(item => { zoneSummary[item.zone]++; });

    const criticalItems = bprAnalysis.filter(item => item.zone === 'red').sort((a, b) => b.bpr - a.bpr);

    const machines = plantFilter
      ? dbAll('SELECT * FROM machines WHERE plant_id = ?', [plantFilter])
      : dbAll('SELECT * FROM machines');
    const machineAnalysis = machines.map(m => ({ ...m, ...detectBottleneck(m) }));
    const bottleneckCount = machineAnalysis.filter(m => m.isBottleneck).length;

    const suppliers = dbAll("SELECT * FROM suppliers WHERE status != 'inactive'");
    const supplierRisks = suppliers.map(s => ({
      ...s,
      riskScore: calculateSupplierRisk(s.delayed_deliveries, s.total_deliveries),
      riskLevel: calculateSupplierRisk(s.delayed_deliveries, s.total_deliveries) > 25 ? 'high' :
                 calculateSupplierRisk(s.delayed_deliveries, s.total_deliveries) > 15 ? 'medium' : 'low'
    }));
    const highRiskSuppliers = supplierRisks.filter(s => s.riskLevel === 'high').length;

    const recentAlerts = plantFilter
      ? dbAll('SELECT * FROM alerts WHERE acknowledged = 0 AND (plant_id = ? OR plant_id IS NULL) ORDER BY created_at DESC LIMIT 10', [plantFilter])
      : dbAll('SELECT * FROM alerts WHERE acknowledged = 0 ORDER BY created_at DESC LIMIT 10');

    const pendingOrders = plantFilter
      ? dbGet("SELECT COUNT(*) as count FROM orders WHERE status IN ('pending','confirmed','shipped') AND plant_id = ?", [plantFilter])
      : dbGet("SELECT COUNT(*) as count FROM orders WHERE status IN ('pending','confirmed','shipped')");

    const delayedOrders = plantFilter
      ? dbGet("SELECT COUNT(*) as count FROM orders WHERE status = 'delayed' AND plant_id = ?", [plantFilter])
      : dbGet("SELECT COUNT(*) as count FROM orders WHERE status = 'delayed'");

    const plants = dbAll('SELECT * FROM plants');

    const avgBPR = bprAnalysis.length > 0
      ? Math.round(bprAnalysis.reduce((sum, item) => sum + item.bpr, 0) / bprAnalysis.length * 100) / 100
      : 0;

    res.json({
      kpis: {
        totalProducts: productCount.count,
        avgBPR,
        criticalItems: criticalItems.length,
        bottlenecks: bottleneckCount,
        highRiskSuppliers,
        pendingOrders: pendingOrders.count,
        delayedOrders: delayedOrders.count,
        activeAlerts: recentAlerts.length
      },
      zoneSummary,
      criticalItems: criticalItems.slice(0, 5),
      machineAnalysis,
      supplierRisks,
      recentAlerts,
      plants,
      inventoryOverview: bprAnalysis
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/dashboard/plants
router.get('/plants', (req, res) => {
  try {
    const plants = dbAll('SELECT * FROM plants');
    const plantOverview = plants.map(plant => {
      const inventory = dbAll('SELECT * FROM inventory WHERE plant_id = ?', [plant.id]);
      const bprData = inventory.map(inv => analyzeBPR(inv));
      const machines = dbAll('SELECT * FROM machines WHERE plant_id = ?', [plant.id]);
      const machineData = machines.map(m => detectBottleneck(m));
      return {
        ...plant,
        inventoryCount: inventory.length,
        avgBPR: bprData.length > 0 ? Math.round(bprData.reduce((s, b) => s + b.bpr, 0) / bprData.length) : 0,
        redCount: bprData.filter(b => b.zone === 'red').length,
        yellowCount: bprData.filter(b => b.zone === 'yellow').length,
        greenCount: bprData.filter(b => b.zone === 'green').length,
        machineCount: machines.length,
        bottleneckCount: machineData.filter(m => m.isBottleneck).length
      };
    });
    res.json(plantOverview);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
