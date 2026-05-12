const express = require('express');
const db = require('../database');
const auth = require('../middleware/auth');

const router = express.Router();

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
