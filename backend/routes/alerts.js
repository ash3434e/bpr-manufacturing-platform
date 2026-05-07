// Alert Routes
const express = require('express');
const router = express.Router();
const { dbAll, dbGet, dbRun } = require('../db/init');

// GET /api/alerts/summary
router.get('/summary', (req, res) => {
  try {
    const total = dbGet("SELECT COUNT(*) as count FROM alerts WHERE acknowledged = 0");
    const critical = dbGet("SELECT COUNT(*) as count FROM alerts WHERE acknowledged = 0 AND severity = 'critical'");
    const warning = dbGet("SELECT COUNT(*) as count FROM alerts WHERE acknowledged = 0 AND severity = 'warning'");
    const info = dbGet("SELECT COUNT(*) as count FROM alerts WHERE acknowledged = 0 AND severity = 'info'");
    const byType = dbAll("SELECT type, COUNT(*) as count FROM alerts WHERE acknowledged = 0 GROUP BY type");
    res.json({ total: total.count, critical: critical.count, warning: warning.count, info: info.count, byType: Object.fromEntries(byType.map(t => [t.type, t.count])) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/alerts
router.get('/', (req, res) => {
  try {
    const { type, severity, acknowledged, plant_id, limit = 50 } = req.query;
    let query = 'SELECT a.*, p.name as plant_name FROM alerts a LEFT JOIN plants p ON a.plant_id = p.id WHERE 1=1';
    const params = [];
    if (type) { query += ' AND a.type = ?'; params.push(type); }
    if (severity) { query += ' AND a.severity = ?'; params.push(severity); }
    if (acknowledged !== undefined) { query += ' AND a.acknowledged = ?'; params.push(parseInt(acknowledged)); }
    if (plant_id) { query += ' AND (a.plant_id = ? OR a.plant_id IS NULL)'; params.push(parseInt(plant_id)); }
    query += ' ORDER BY a.created_at DESC LIMIT ?';
    params.push(parseInt(limit));
    res.json(dbAll(query, params));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/alerts/:id/acknowledge
router.put('/:id/acknowledge', (req, res) => {
  try {
    const userId = req.user ? req.user.id : null;
    dbRun('UPDATE alerts SET acknowledged = 1, acknowledged_by = ?, acknowledged_at = CURRENT_TIMESTAMP WHERE id = ?', [userId, parseInt(req.params.id)]);
    res.json(dbGet('SELECT * FROM alerts WHERE id = ?', [parseInt(req.params.id)]));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
