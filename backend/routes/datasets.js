const express = require('express');
const db = require('../database');
const auth = require('../middleware/auth');

const router = express.Router();

// List all datasets for user
router.get('/', auth, (req, res) => {
  const datasets = db.prepare(
    'SELECT * FROM datasets WHERE scout_id = ? ORDER BY created_at DESC'
  ).all(req.user.id);
  res.json(datasets);
});

// Get players for a dataset
router.get('/:id/players', auth, (req, res) => {
  const dataset = db.prepare('SELECT * FROM datasets WHERE id = ? AND scout_id = ?').get(req.params.id, req.user.id);
  if (!dataset) return res.status(404).json({ error: 'Dataset niet gevonden.' });

  const { search, tier, position, page = 1, limit = 50 } = req.query;
  const offset = (parseInt(page) - 1) * parseInt(limit);

  let query = 'SELECT * FROM dataset_players WHERE dataset_id = ? AND scout_id = ?';
  const params = [req.params.id, req.user.id];

  if (tier) { query += ' AND potential_tier = ?'; params.push(tier); }
  if (position) { query += ' AND position LIKE ?'; params.push(`%${position}%`); }
  if (search) { query += ' AND (name LIKE ? OR squad LIKE ?)'; params.push(`%${search}%`, `%${search}%`); }

  query += ' ORDER BY potential_score DESC';

  const countQuery = query.replace('SELECT *', 'SELECT COUNT(*) as c');
  const total = db.prepare(countQuery).get(...params).c;
  const players = db.prepare(query + ' LIMIT ? OFFSET ?').all(...params, parseInt(limit), offset);

  res.json({ dataset, players, total, page: parseInt(page), pages: Math.ceil(total / parseInt(limit)) });
});

// Delete a dataset (and its players)
router.delete('/:id', auth, (req, res) => {
  const dataset = db.prepare('SELECT * FROM datasets WHERE id = ? AND scout_id = ?').get(req.params.id, req.user.id);
  if (!dataset) return res.status(404).json({ error: 'Dataset niet gevonden.' });

  db.prepare('DELETE FROM dataset_players WHERE dataset_id = ?').run(req.params.id);
  db.prepare('DELETE FROM datasets WHERE id = ?').run(req.params.id);

  res.json({ message: 'Dataset verwijderd.' });
});

module.exports = router;
