const express = require('express');
const { pool } = require('../database');
const auth = require('../middleware/auth');

const router = express.Router();

// Get all notifications
router.get('/', auth, async (req, res) => {
  try {
    const [notifications, unread] = await Promise.all([
      pool.query('SELECT * FROM notifications WHERE scout_id = $1 ORDER BY created_at DESC LIMIT 50', [req.user.id]),
      pool.query('SELECT COUNT(*) FROM notifications WHERE scout_id = $1 AND read = 0', [req.user.id]),
    ]);
    res.json({ notifications: notifications.rows, unread: parseInt(unread.rows[0].count) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error.' });
  }
});

// Mark notification as read
router.put('/:id/read', auth, async (req, res) => {
  try {
    await pool.query('UPDATE notifications SET read = 1 WHERE id = $1 AND scout_id = $2', [req.params.id, req.user.id]);
    res.json({ message: 'Gemarkeerd als gelezen.' });
  } catch (err) {
    res.status(500).json({ error: 'Server error.' });
  }
});

// Mark all as read
router.put('/read-all', auth, async (req, res) => {
  try {
    await pool.query('UPDATE notifications SET read = 1 WHERE scout_id = $1', [req.user.id]);
    res.json({ message: 'Alle meldingen gelezen.' });
  } catch (err) {
    res.status(500).json({ error: 'Server error.' });
  }
});

// Delete notification
router.delete('/:id', auth, async (req, res) => {
  try {
    await pool.query('DELETE FROM notifications WHERE id = $1 AND scout_id = $2', [req.params.id, req.user.id]);
    res.json({ message: 'Melding verwijderd.' });
  } catch (err) {
    res.status(500).json({ error: 'Server error.' });
  }
});

module.exports = router;
