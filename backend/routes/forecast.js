// Forecast Routes
const express = require('express');
const router = express.Router();
const { dbAll, dbGet } = require('../db/init');
const { movingAverage, linearRegression, weightedMovingAverage, whatIfSimulation } = require('../utils/forecast');
const { analyzeBPR } = require('../utils/bpr');

// GET /api/forecast - products with demand history
router.get('/', (req, res) => {
  try {
    const products = dbAll(`SELECT DISTINCT p.*, pl.name as plant_name, COUNT(dh.id) as data_points
      FROM products p JOIN demand_history dh ON p.id = dh.product_id
      JOIN plants pl ON p.plant_id = pl.id GROUP BY p.id ORDER BY p.name`);
    res.json(products);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/forecast/simulate
router.post('/simulate', (req, res) => {
  try {
    const { product_id, scenario } = req.body;
    if (!product_id || !scenario) return res.status(400).json({ error: 'product_id and scenario required' });
    const inventory = dbGet(`SELECT i.*, p.name as product_name, p.sku FROM inventory i JOIN products p ON i.product_id = p.id WHERE i.product_id = ?`, [product_id]);
    if (!inventory) return res.status(404).json({ error: 'Inventory not found' });
    const currentAnalysis = analyzeBPR(inventory);
    const simResult = whatIfSimulation(inventory, scenario);
    res.json({
      product: { id: inventory.product_id, name: inventory.product_name, sku: inventory.sku },
      current: { bpr: currentAnalysis.bpr, zone: currentAnalysis.zone, availableStock: currentAnalysis.availableStock, daysOfStock: currentAnalysis.daysOfStock },
      simulated: { bpr: simResult.simulated_bpr, zone: simResult.simulated_zone, availableStock: simResult.simulated_available, daysOfStock: simResult.simulated_days_of_stock },
      scenario,
      impact: { bprChange: Math.round((simResult.simulated_bpr - currentAnalysis.bpr) * 100) / 100, stockChange: simResult.simulated_available - currentAnalysis.availableStock, zoneChanged: simResult.simulated_zone !== currentAnalysis.zone }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/forecast/:productId
router.get('/:productId', (req, res) => {
  try {
    const { method = 'moving_average', window = 7 } = req.query;
    const history = dbAll('SELECT * FROM demand_history WHERE product_id = ? ORDER BY date ASC', [parseInt(req.params.productId)]);
    if (history.length === 0) return res.status(404).json({ error: 'No demand history found' });
    let forecast;
    switch (method) {
      case 'linear_regression': forecast = linearRegression(history); break;
      case 'weighted_moving_average': forecast = weightedMovingAverage(history, parseInt(window)); break;
      default: forecast = movingAverage(history, parseInt(window)); break;
    }
    const actuals = forecast.filter(f => f.actual !== null && f.actual > 0);
    const mape = actuals.length > 0 ? Math.round(actuals.reduce((sum, f) => sum + Math.abs(f.actual - f.forecast) / f.actual, 0) / actuals.length * 100 * 100) / 100 : null;
    const product = dbGet('SELECT * FROM products WHERE id = ?', [parseInt(req.params.productId)]);
    const recentHistory = history.slice(-14);
    const olderHistory = history.slice(-28, -14);
    const recentAvg = recentHistory.reduce((sum, h) => sum + h.quantity, 0) / recentHistory.length;
    const olderAvg = olderHistory.length > 0 ? olderHistory.reduce((sum, h) => sum + h.quantity, 0) / olderHistory.length : recentAvg;
    const trendPct = olderAvg > 0 ? Math.round(((recentAvg - olderAvg) / olderAvg) * 100 * 100) / 100 : 0;
    const avgQty = history.reduce((sum, h) => sum + h.quantity, 0) / history.length;
    const stdDev = Math.sqrt(history.reduce((sum, h) => sum + Math.pow(h.quantity - avgQty, 2), 0) / history.length);
    const spikes = history.filter(h => h.quantity > avgQty + 2 * stdDev);
    res.json({
      product, method, forecast,
      metrics: { mape, trendPct, trend: trendPct > 5 ? 'increasing' : trendPct < -5 ? 'decreasing' : 'stable', avgDemand: Math.round(avgQty * 100) / 100, maxDemand: Math.max(...history.map(h => h.quantity)), minDemand: Math.min(...history.map(h => h.quantity)), spikeCount: spikes.length, dataPoints: history.length }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
