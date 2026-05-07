// Audit Routes
const express = require('express');
const router = express.Router();
const { dbAll } = require('../db/init');

router.get('/', (req, res) => {
  try {
    const { user_id, action, entity_type, limit = 50 } = req.query;
    let query = 'SELECT al.*, u.username, u.full_name FROM audit_log al LEFT JOIN users u ON al.user_id = u.id WHERE 1=1';
    const params = [];
    if (user_id) { query += ' AND al.user_id = ?'; params.push(parseInt(user_id)); }
    if (action) { query += ' AND al.action = ?'; params.push(action); }
    if (entity_type) { query += ' AND al.entity_type = ?'; params.push(entity_type); }
    query += ' ORDER BY al.timestamp DESC LIMIT ?';
    params.push(parseInt(limit));
    res.json(dbAll(query, params));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
