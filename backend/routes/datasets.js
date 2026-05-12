const express = require('express');
const { pool } = require('../database');
const auth = require('../middleware/auth');

const router = express.Router();

// List all datasets for user
router.get('/', auth, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM datasets WHERE scout_id = $1 ORDER BY created_at DESC',
      [req.user.id]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error.' });
  }
});

// Get players for a dataset
router.get('/:id/players', auth, async (req, res) => {
  try {
    const datasetResult = await pool.query(
      'SELECT * FROM datasets WHERE id = $1 AND scout_id = $2',
      [req.params.id, req.user.id]
    );
    if (!datasetResult.rows[0]) return res.status(404).json({ error: 'Dataset niet gevonden.' });

    const { search, tier, position, page = 1, limit = 50 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    let idx = 3;
    let where = 'dataset_id = $1 AND scout_id = $2';
    const params = [req.params.id, req.user.id];

    if (tier) { where += ` AND potential_tier = $${idx++}`; params.push(tier); }
    if (position) { where += ` AND position ILIKE $${idx++}`; params.push(`%${position}%`); }
    if (search) {
      where += ` AND (name ILIKE $${idx} OR squad ILIKE $${idx + 1})`;
      params.push(`%${search}%`, `%${search}%`);
      idx += 2;
    }

    const countResult = await pool.query(`SELECT COUNT(*) FROM dataset_players WHERE ${where}`, params);
    const total = parseInt(countResult.rows[0].count);

    const playersResult = await pool.query(
      `SELECT * FROM dataset_players WHERE ${where} ORDER BY potential_score DESC LIMIT $${idx} OFFSET $${idx + 1}`,
      [...params, parseInt(limit), offset]
    );

    res.json({
      dataset: datasetResult.rows[0],
      players: playersResult.rows,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / parseInt(limit)),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error.' });
  }
});

// Delete a dataset (cascade removes its players via FK)
router.delete('/:id', auth, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM datasets WHERE id = $1 AND scout_id = $2',
      [req.params.id, req.user.id]
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'Dataset niet gevonden.' });

    await pool.query('DELETE FROM datasets WHERE id = $1', [req.params.id]);
    res.json({ message: 'Dataset verwijderd.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error.' });
  }
});

module.exports = router;
