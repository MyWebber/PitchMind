const express = require('express');
const { pool } = require('../database');
const auth = require('../middleware/auth');

const router = express.Router();

// Get all scouted players
router.get('/', auth, async (req, res) => {
  try {
    const { status, search, page = 1, limit = 20 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    let idx = 2;
    let where = 'scout_id = $1';
    const params = [req.user.id];

    if (status) { where += ` AND status = $${idx++}`; params.push(status); }
    if (search) {
      where += ` AND (name ILIKE $${idx} OR squad ILIKE $${idx + 1} OR position ILIKE $${idx + 2})`;
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
      idx += 3;
    }

    const countResult = await pool.query(`SELECT COUNT(*) FROM scouted_players WHERE ${where}`, params);
    const total = parseInt(countResult.rows[0].count);

    const dataResult = await pool.query(
      `SELECT * FROM scouted_players WHERE ${where} ORDER BY starred DESC, potential_score DESC LIMIT $${idx} OFFSET $${idx + 1}`,
      [...params, parseInt(limit), offset]
    );

    res.json({ players: dataResult.rows, total, page: parseInt(page), pages: Math.ceil(total / parseInt(limit)) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error.' });
  }
});

// Add player to scouted list
router.post('/', auth, async (req, res) => {
  try {
    const { name, nation, position, squad, competition, age, born, goals, assists, minutes,
      matches_played, starts, yellow_cards, red_cards, shots, shots_on_target,
      tackles_won, interceptions, crosses, fouls_drawn, goals_per_90, assists_per_90,
      sot_percent, potential_score, ai_report, status, notes } = req.body;

    if (!name) return res.status(400).json({ error: 'Naam is verplicht.' });

    const result = await pool.query(`
      INSERT INTO scouted_players (
        scout_id, name, nation, position, squad, competition, age, born,
        goals, assists, minutes, matches_played, starts, yellow_cards, red_cards,
        shots, shots_on_target, tackles_won, interceptions, crosses, fouls_drawn,
        goals_per_90, assists_per_90, sot_percent, potential_score, ai_report, status, notes
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27,$28)
      RETURNING *
    `, [
      req.user.id, name, nation, position, squad, competition, age, born,
      goals || 0, assists || 0, minutes || 0, matches_played || 0, starts || 0,
      yellow_cards || 0, red_cards || 0, shots || 0, shots_on_target || 0,
      tackles_won || 0, interceptions || 0, crosses || 0, fouls_drawn || 0,
      goals_per_90 || 0, assists_per_90 || 0, sot_percent || 0,
      potential_score || 0, ai_report || '', status || 'watching', notes || ''
    ]);

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error.' });
  }
});

// Update scouted player
router.put('/:id', auth, async (req, res) => {
  try {
    const { status, notes, starred } = req.body;
    const existing = await pool.query(
      'SELECT * FROM scouted_players WHERE id = $1 AND scout_id = $2',
      [req.params.id, req.user.id]
    );
    if (!existing.rows[0]) return res.status(404).json({ error: 'Speler niet gevonden.' });

    const e = existing.rows[0];
    const updated = await pool.query(
      'UPDATE scouted_players SET status = $1, notes = $2, starred = $3 WHERE id = $4 AND scout_id = $5 RETURNING *',
      [status ?? e.status, notes ?? e.notes, starred ?? e.starred, req.params.id, req.user.id]
    );
    res.json(updated.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error.' });
  }
});

// Delete scouted player
router.delete('/:id', auth, async (req, res) => {
  try {
    const result = await pool.query(
      'DELETE FROM scouted_players WHERE id = $1 AND scout_id = $2',
      [req.params.id, req.user.id]
    );
    if (result.rowCount === 0) return res.status(404).json({ error: 'Speler niet gevonden.' });
    res.json({ message: 'Speler verwijderd.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error.' });
  }
});

// Dashboard stats
router.get('/stats/summary', auth, async (req, res) => {
  try {
    const id = req.user.id;
    const [ts, st, wa, sl, td, ta, tt, rp] = await Promise.all([
      pool.query('SELECT COUNT(*) FROM scouted_players WHERE scout_id = $1', [id]),
      pool.query('SELECT COUNT(*) FROM scouted_players WHERE scout_id = $1 AND starred = 1', [id]),
      pool.query("SELECT COUNT(*) FROM scouted_players WHERE scout_id = $1 AND status = 'watching'", [id]),
      pool.query("SELECT COUNT(*) FROM scouted_players WHERE scout_id = $1 AND status = 'shortlisted'", [id]),
      pool.query('SELECT COUNT(*) FROM datasets WHERE scout_id = $1', [id]),
      pool.query('SELECT COUNT(*) FROM dataset_players WHERE scout_id = $1', [id]),
      pool.query("SELECT COUNT(*) FROM dataset_players WHERE scout_id = $1 AND potential_tier IN ('S','A')", [id]),
      pool.query('SELECT * FROM scouted_players WHERE scout_id = $1 ORDER BY created_at DESC LIMIT 5', [id]),
    ]);

    res.json({
      totalScouted: parseInt(ts.rows[0].count),
      starred: parseInt(st.rows[0].count),
      watching: parseInt(wa.rows[0].count),
      shortlisted: parseInt(sl.rows[0].count),
      totalDatasets: parseInt(td.rows[0].count),
      totalAnalyzed: parseInt(ta.rows[0].count),
      topTalents: parseInt(tt.rows[0].count),
      recentPlayers: rp.rows,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error.' });
  }
});

module.exports = router;

// Get all scouted players
router.get('/', auth, (req, res) => {
  const { status, search, page = 1, limit = 20 } = req.query;
  const offset = (parseInt(page) - 1) * parseInt(limit);

  let query = 'SELECT * FROM scouted_players WHERE scout_id = ?';
  const params = [req.user.id];

  if (status) { query += ' AND status = ?'; params.push(status); }
  if (search) { query += ' AND (name LIKE ? OR squad LIKE ? OR position LIKE ?)'; params.push(`%${search}%`, `%${search}%`, `%${search}%`); }

  query += ' ORDER BY starred DESC, potential_score DESC';

  const total = db.prepare(query.replace('SELECT *', 'SELECT COUNT(*)')).get(...params)['COUNT(*)'];
  const players = db.prepare(query + ' LIMIT ? OFFSET ?').all(...params, parseInt(limit), offset);

  res.json({ players, total, page: parseInt(page), pages: Math.ceil(total / parseInt(limit)) });
});

// Add player to scouted list
router.post('/', auth, (req, res) => {
  const { name, nation, position, squad, competition, age, born, goals, assists, minutes,
    matches_played, starts, yellow_cards, red_cards, shots, shots_on_target,
    tackles_won, interceptions, crosses, fouls_drawn, goals_per_90, assists_per_90,
    sot_percent, potential_score, potential_tier, ai_report, status, notes } = req.body;

  if (!name) return res.status(400).json({ error: 'Naam is verplicht.' });

  const result = db.prepare(`
    INSERT INTO scouted_players (
      scout_id, name, nation, position, squad, competition, age, born,
      goals, assists, minutes, matches_played, starts, yellow_cards, red_cards,
      shots, shots_on_target, tackles_won, interceptions, crosses, fouls_drawn,
      goals_per_90, assists_per_90, sot_percent, potential_score, ai_report, status, notes
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    req.user.id, name, nation, position, squad, competition, age, born,
    goals || 0, assists || 0, minutes || 0, matches_played || 0, starts || 0,
    yellow_cards || 0, red_cards || 0, shots || 0, shots_on_target || 0,
    tackles_won || 0, interceptions || 0, crosses || 0, fouls_drawn || 0,
    goals_per_90 || 0, assists_per_90 || 0, sot_percent || 0,
    potential_score || 0, ai_report || '', status || 'watching', notes || ''
  );

  const player = db.prepare('SELECT * FROM scouted_players WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(player);
});

// Update scouted player
router.put('/:id', auth, (req, res) => {
  const { status, notes, starred } = req.body;
  const existing = db.prepare('SELECT * FROM scouted_players WHERE id = ? AND scout_id = ?').get(req.params.id, req.user.id);
  if (!existing) return res.status(404).json({ error: 'Speler niet gevonden.' });

  db.prepare('UPDATE scouted_players SET status = ?, notes = ?, starred = ? WHERE id = ? AND scout_id = ?')
    .run(status ?? existing.status, notes ?? existing.notes, starred ?? existing.starred, req.params.id, req.user.id);

  const updated = db.prepare('SELECT * FROM scouted_players WHERE id = ?').get(req.params.id);
  res.json(updated);
});

// Delete scouted player
router.delete('/:id', auth, (req, res) => {
  const result = db.prepare('DELETE FROM scouted_players WHERE id = ? AND scout_id = ?').run(req.params.id, req.user.id);
  if (result.changes === 0) return res.status(404).json({ error: 'Speler niet gevonden.' });
  res.json({ message: 'Speler verwijderd.' });
});

// Dashboard stats
router.get('/stats/summary', auth, (req, res) => {
  const totalScouted = db.prepare('SELECT COUNT(*) as c FROM scouted_players WHERE scout_id = ?').get(req.user.id).c;
  const starred = db.prepare('SELECT COUNT(*) as c FROM scouted_players WHERE scout_id = ? AND starred = 1').get(req.user.id).c;
  const watching = db.prepare('SELECT COUNT(*) as c FROM scouted_players WHERE scout_id = ? AND status = "watching"').get(req.user.id).c;
  const shortlisted = db.prepare('SELECT COUNT(*) as c FROM scouted_players WHERE scout_id = ? AND status = "shortlisted"').get(req.user.id).c;
  const totalDatasets = db.prepare('SELECT COUNT(*) as c FROM datasets WHERE scout_id = ?').get(req.user.id).c;
  const totalAnalyzed = db.prepare('SELECT COUNT(*) as c FROM dataset_players WHERE scout_id = ?').get(req.user.id).c;
  const topTalents = db.prepare("SELECT COUNT(*) as c FROM dataset_players WHERE scout_id = ? AND potential_tier IN ('S','A')").get(req.user.id).c;
  const recentPlayers = db.prepare('SELECT * FROM scouted_players WHERE scout_id = ? ORDER BY created_at DESC LIMIT 5').all(req.user.id);

  res.json({ totalScouted, starred, watching, shortlisted, totalDatasets, totalAnalyzed, topTalents, recentPlayers });
});

module.exports = router;
