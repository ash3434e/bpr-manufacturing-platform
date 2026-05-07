// Production Routes
const express = require('express');
const router = express.Router();
const { dbAll, dbGet } = require('../db/init');
const { detectBottleneck } = require('../utils/bpr');

// GET /api/production/machines
router.get('/machines', (req, res) => {
  try {
    const { plant_id } = req.query;
    const machines = plant_id
      ? dbAll('SELECT m.*, p.name as plant_name FROM machines m JOIN plants p ON m.plant_id = p.id WHERE m.plant_id = ? ORDER BY m.utilization_pct DESC', [parseInt(plant_id)])
      : dbAll('SELECT m.*, p.name as plant_name FROM machines m JOIN plants p ON m.plant_id = p.id ORDER BY m.utilization_pct DESC');
    res.json(machines.map(m => ({ ...m, ...detectBottleneck(m) })));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/production/schedule
router.get('/schedule', (req, res) => {
  try {
    const { plant_id, status } = req.query;
    let query = `SELECT ps.*, p.name as product_name, m.name as machine_name, pl.name as plant_name
      FROM production_schedule ps JOIN products p ON ps.product_id = p.id
      JOIN machines m ON ps.machine_id = m.id JOIN plants pl ON ps.plant_id = pl.id WHERE 1=1`;
    const params = [];
    if (plant_id) { query += ' AND ps.plant_id = ?'; params.push(parseInt(plant_id)); }
    if (status) { query += ' AND ps.status = ?'; params.push(status); }
    query += ' ORDER BY ps.scheduled_date ASC';
    res.json(dbAll(query, params));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/production/bottlenecks
router.get('/bottlenecks', (req, res) => {
  try {
    const machines = dbAll('SELECT m.*, p.name as plant_name FROM machines m JOIN plants p ON m.plant_id = p.id');
    const bottlenecks = machines.map(m => ({ ...m, ...detectBottleneck(m) })).filter(m => m.isBottleneck).sort((a, b) => b.utilization - a.utilization);
    res.json(bottlenecks);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/production/overview
router.get('/overview', (req, res) => {
  try {
    const { plant_id } = req.query;
    const machines = plant_id
      ? dbAll('SELECT * FROM machines WHERE plant_id = ?', [parseInt(plant_id)])
      : dbAll('SELECT * FROM machines');
    const totalCapacity = machines.reduce((sum, m) => sum + m.capacity_per_hour, 0);
    const totalLoad = machines.reduce((sum, m) => sum + m.current_load, 0);
    const avgUtilization = machines.length > 0 ? Math.round(machines.reduce((sum, m) => sum + m.utilization_pct, 0) / machines.length * 100) / 100 : 0;
    const statusCounts = {};
    machines.forEach(m => { statusCounts[m.status] = (statusCounts[m.status] || 0) + 1; });
    const bottleneckList = machines.map(m => ({ ...m, ...detectBottleneck(m) })).filter(m => m.isBottleneck);
    const completed = plant_id
      ? dbGet("SELECT COUNT(*) as count FROM production_schedule WHERE plant_id = ? AND status = 'completed'", [parseInt(plant_id)])
      : dbGet("SELECT COUNT(*) as count FROM production_schedule WHERE status = 'completed'");
    const total = plant_id
      ? dbGet("SELECT COUNT(*) as count FROM production_schedule WHERE plant_id = ?", [parseInt(plant_id)])
      : dbGet("SELECT COUNT(*) as count FROM production_schedule");
    res.json({
      totalMachines: machines.length, totalCapacity, totalLoad, avgUtilization, statusCounts,
      bottleneckCount: bottleneckList.length, bottlenecks: bottleneckList,
      completionRate: total.count > 0 ? Math.round(completed.count / total.count * 100) : 0
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
