// Auto-Scheduling Routes
const express = require('express');
const router = express.Router();
const { dbAll, dbGet, dbRun } = require('../db/init');
const { autoScheduleOrder, scheduleAllOrders, PROCESS_TEMPLATES } = require('../utils/scheduler');

// GET /api/scheduling - Schedule all active orders
router.get('/', (req, res) => {
  try {
    const bufferDays = parseInt(req.query.buffer_days) || 1;
    const schedules = scheduleAllOrders(bufferDays);
    const summary = {
      total: schedules.length,
      green: schedules.filter(s => s.schedulability === 'green').length,
      yellow: schedules.filter(s => s.schedulability === 'yellow').length,
      red: schedules.filter(s => s.schedulability === 'red').length,
      errors: schedules.filter(s => s.error).length
    };
    res.json({ summary, schedules });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/scheduling/:orderId - Schedule specific order
router.get('/:orderId', (req, res) => {
  try {
    const bufferDays = parseInt(req.query.buffer_days) || 1;
    const schedule = autoScheduleOrder(parseInt(req.params.orderId), bufferDays);
    res.json(schedule);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/scheduling/templates/list - Get process templates
router.get('/templates/list', (req, res) => {
  res.json(PROCESS_TEMPLATES);
});

module.exports = router;
