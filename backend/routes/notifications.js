const express = require('express');
const db = require('../database');
const auth = require('../middleware/auth');

const router = express.Router();

// Get all notifications
router.get('/', auth, (req, res) => {
  const notifications = db.prepare(
    'SELECT * FROM notifications WHERE scout_id = ? ORDER BY created_at DESC LIMIT 50'
  ).all(req.user.id);
  const unread = db.prepare('SELECT COUNT(*) as c FROM notifications WHERE scout_id = ? AND read = 0').get(req.user.id).c;
  res.json({ notifications, unread });
});

// Mark notification as read
router.put('/:id/read', auth, (req, res) => {
  db.prepare('UPDATE notifications SET read = 1 WHERE id = ? AND scout_id = ?').run(req.params.id, req.user.id);
  res.json({ message: 'Gemarkeerd als gelezen.' });
});

// Mark all as read
router.put('/read-all', auth, (req, res) => {
  db.prepare('UPDATE notifications SET read = 1 WHERE scout_id = ?').run(req.user.id);
  res.json({ message: 'Alle meldingen gelezen.' });
});

// Delete notification
router.delete('/:id', auth, (req, res) => {
  db.prepare('DELETE FROM notifications WHERE id = ? AND scout_id = ?').run(req.params.id, req.user.id);
  res.json({ message: 'Melding verwijderd.' });
});

module.exports = router;
