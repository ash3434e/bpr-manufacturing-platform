// User Management Routes — Admin creates/deletes users, any user changes own password
const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { dbAll, dbGet, dbRun } = require('../db/init');

// GET /api/users — Admin sees all users
router.get('/', (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin access required' });
  try {
    const users = dbAll(`
      SELECT u.id, u.username, u.full_name, u.role, u.plant_id, u.email, u.is_active, u.created_at, p.name as plant_name
      FROM users u LEFT JOIN plants p ON u.plant_id = p.id ORDER BY u.id
    `);
    res.json(users);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST /api/users — Admin creates a new user
router.post('/', (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin access required' });
  try {
    const { username, password, full_name, role, plant_id, email } = req.body;
    if (!username || !password || !full_name || !role) {
      return res.status(400).json({ error: 'Username, password, full name, and role are required' });
    }
    const existing = dbGet('SELECT id FROM users WHERE username = ?', [username]);
    if (existing) return res.status(409).json({ error: 'Username already exists' });

    const hash = bcrypt.hashSync(password, 10);
    const r = dbRun(
      'INSERT INTO users (username, password_hash, full_name, role, plant_id, email) VALUES (?,?,?,?,?,?)',
      [username, hash, full_name, role, plant_id || null, email || null]
    );
    dbRun('INSERT INTO audit_log (user_id, action, entity_type, entity_id, details) VALUES (?,?,?,?,?)',
      [req.user.id, 'create_user', 'user', r.lastInsertRowid, JSON.stringify({ username, role, full_name })]);
    res.json({ id: r.lastInsertRowid, username, full_name, role, plant_id, email, is_active: 1 });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// PUT /api/users/:id — Admin updates user details (not password)
router.put('/:id', (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin access required' });
  try {
    const { full_name, role, plant_id, email, is_active } = req.body;
    const userId = parseInt(req.params.id);
    if (userId === req.user.id && is_active === 0) {
      return res.status(400).json({ error: 'Cannot deactivate your own account' });
    }
    dbRun('UPDATE users SET full_name=?, role=?, plant_id=?, email=?, is_active=? WHERE id=?',
      [full_name, role, plant_id || null, email || null, is_active !== undefined ? is_active : 1, userId]);
    dbRun('INSERT INTO audit_log (user_id, action, entity_type, entity_id, details) VALUES (?,?,?,?,?)',
      [req.user.id, 'update_user', 'user', userId, JSON.stringify(req.body)]);
    res.json(dbGet('SELECT id, username, full_name, role, plant_id, email, is_active FROM users WHERE id=?', [userId]));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// DELETE /api/users/:id — Admin deletes a user
router.delete('/:id', (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin access required' });
  try {
    const userId = parseInt(req.params.id);
    if (userId === req.user.id) return res.status(400).json({ error: 'Cannot delete your own account' });
    const user = dbGet('SELECT username FROM users WHERE id=?', [userId]);
    dbRun('DELETE FROM users WHERE id=?', [userId]);
    dbRun('INSERT INTO audit_log (user_id, action, entity_type, entity_id, details) VALUES (?,?,?,?,?)',
      [req.user.id, 'delete_user', 'user', userId, JSON.stringify({ deleted_user: user?.username })]);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST /api/users/:id/reset-password — Admin resets any user's password
router.post('/:id/reset-password', (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin access required' });
  try {
    const { new_password } = req.body;
    if (!new_password || new_password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' });
    const hash = bcrypt.hashSync(new_password, 10);
    dbRun('UPDATE users SET password_hash=? WHERE id=?', [hash, parseInt(req.params.id)]);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST /api/users/change-password — Any user changes their own password
router.post('/change-password', (req, res) => {
  try {
    const { current_password, new_password } = req.body;
    if (!new_password || new_password.length < 6) return res.status(400).json({ error: 'New password must be at least 6 characters' });
    const user = dbGet('SELECT * FROM users WHERE id = ?', [req.user.id]);
    if (!user || !bcrypt.compareSync(current_password, user.password_hash)) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }
    const hash = bcrypt.hashSync(new_password, 10);
    dbRun('UPDATE users SET password_hash=? WHERE id=?', [hash, req.user.id]);
    dbRun('INSERT INTO audit_log (user_id, action, details) VALUES (?,?,?)',
      [req.user.id, 'change_password', 'User changed their own password']);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
