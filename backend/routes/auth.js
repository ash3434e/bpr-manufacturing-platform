// Authentication Routes
const express = require('express');
const bcrypt = require('bcryptjs');
const router = express.Router();
const { dbGet, dbRun, dbAll } = require('../db/init');
const { generateToken, authenticate } = require('../middleware/auth');

// POST /api/auth/login
router.post('/login', (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password required' });
    }

    const user = dbGet('SELECT * FROM users WHERE username = ? AND is_active = 1', [username]);
    if (!user || !bcrypt.compareSync(password, user.password_hash)) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = generateToken(user);
    dbRun('INSERT INTO audit_log (user_id, action, details) VALUES (?, ?, ?)', [user.id, 'login', `User ${username} logged in`]);

    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        full_name: user.full_name,
        role: user.role,
        plant_id: user.plant_id,
        email: user.email
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/auth/me
router.get('/me', authenticate, (req, res) => {
  try {
    const user = dbGet('SELECT id, username, full_name, role, plant_id, email FROM users WHERE id = ?', [req.user.id]);
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/auth/users
router.get('/users', authenticate, (req, res) => {
  try {
    const users = dbAll(`
      SELECT u.id, u.username, u.full_name, u.role, u.plant_id, u.email, u.is_active, u.created_at, p.name as plant_name
      FROM users u LEFT JOIN plants p ON u.plant_id = p.id
      ORDER BY u.id
    `);
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
