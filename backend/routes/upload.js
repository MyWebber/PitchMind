const express = require('express');
const multer = require('multer');
const Papa = require('papaparse');
const path = require('path');
const fs = require('fs');
const db = require('../database');
const auth = require('../middleware/auth');
const { batchScore } = require('../ai/scorer');

const router = express.Router();

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, '../uploads');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const unique = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    cb(null, `${unique}-${file.originalname}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 }, // 20MB
  fileFilter: (req, file, cb) => {
    if (!file.originalname.match(/\.(csv)$/i)) {
      return cb(new Error('Alleen CSV-bestanden zijn toegestaan.'));
    }
    cb(null, true);
  },
});

// Upload CSV and run AI analysis
router.post('/', auth, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Geen bestand geüpload.' });
    }

    const fileContent = fs.readFileSync(req.file.path, 'utf8');
    const parsed = Papa.parse(fileContent, {
      header: true,
      skipEmptyLines: true,
      dynamicTyping: true,
    });

    if (parsed.errors.length > 0 && parsed.data.length === 0) {
      return res.status(400).json({ error: 'CSV kon niet worden gelezen.' });
    }

    const rows = parsed.data;

    // Store dataset record
    const datasetResult = db.prepare(
      'INSERT INTO datasets (scout_id, filename, original_name, row_count) VALUES (?, ?, ?, ?)'
    ).run(req.user.id, req.file.filename, req.file.originalname, rows.length);

    const datasetId = datasetResult.lastInsertRowid;

    // Run AI scoring
    const scored = batchScore(rows);

    // Batch insert using a transaction
    const insertPlayer = db.prepare(`
      INSERT INTO dataset_players (
        dataset_id, scout_id, name, nation, position, squad, competition,
        age, born, matches_played, starts, minutes, goals, assists,
        yellow_cards, red_cards, shots, shots_on_target, tackles_won,
        interceptions, crosses, fouls_drawn, goals_per_90, assists_per_90,
        sot_percent, potential_score, potential_tier, ai_report, raw_data
      ) VALUES (
        ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
      )
    `);

    const insertMany = db.transaction((players) => {
      for (const p of players) {
        const nineties = parseFloat(p['90s']) || (parseInt(p.Min || p.minutes) / 90) || 1;
        const goals = parseInt(p.Gls || p.goals) || 0;
        const assists = parseInt(p.Ast || p.assists) || 0;
        const shots = parseInt(p.Sh || p.shots) || 0;
        const sot = parseInt(p.SoT || p.shots_on_target) || 0;

        insertPlayer.run(
          datasetId,
          req.user.id,
          p.Player || p.name || '',
          p.Nation || p.nation || '',
          p.Pos || p.position || '',
          p.Squad || p.squad || '',
          p.Comp || p.competition || '',
          parseFloat(p.Age || p.age) || null,
          parseInt(p.Born || p.born) || null,
          parseInt(p.MP || p.matches_played) || 0,
          parseInt(p.Starts || p.starts) || 0,
          parseInt(p.Min || p.minutes) || 0,
          goals,
          assists,
          parseInt(p.CrdY || p.yellow_cards) || 0,
          parseInt(p.CrdR || p.red_cards) || 0,
          shots,
          sot,
          parseInt(p.TklW || p.tackles_won) || 0,
          parseInt(p.Int || p.interceptions) || 0,
          parseInt(p.Crs || p.crosses) || 0,
          parseInt(p.Fld || p.fouls_drawn) || 0,
          nineties > 0 ? goals / nineties : 0,
          nineties > 0 ? assists / nineties : 0,
          shots > 0 ? (sot / shots) * 100 : 0,
          p.potential_score || 0,
          p.potential_tier || 'C',
          p.ai_report || '',
          JSON.stringify(p)
        );
      }
    });

    insertMany(scored);

    // Mark dataset as analyzed
    db.prepare('UPDATE datasets SET analyzed = 1 WHERE id = ?').run(datasetId);

    // Send notification
    const topTier = scored.filter((p) => p.potential_tier === 'S' || p.potential_tier === 'A').length;
    db.prepare(
      'INSERT INTO notifications (scout_id, title, message, type) VALUES (?, ?, ?, ?)'
    ).run(
      req.user.id,
      'Dataset geanalyseerd!',
      `"${req.file.originalname}" is geanalyseerd. ${rows.length} spelers verwerkt, waarvan ${topTier} toptalenten (Tier S/A) gevonden.`,
      'success'
    );

    res.status(201).json({
      datasetId,
      rowCount: rows.length,
      topTalents: topTier,
      message: 'Dataset succesvol geüpload en geanalyseerd.',
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Upload mislukt: ' + err.message });
  }
});

// Get all datasets for current scout
router.get('/', auth, (req, res) => {
  const datasets = db.prepare(
    'SELECT * FROM datasets WHERE scout_id = ? ORDER BY created_at DESC'
  ).all(req.user.id);
  res.json(datasets);
});

// Get players from a specific dataset
router.get('/:id/players', auth, (req, res) => {
  const { tier, search, minScore, page = 1, limit = 50 } = req.query;
  const offset = (parseInt(page) - 1) * parseInt(limit);

  let query = 'SELECT * FROM dataset_players WHERE dataset_id = ? AND scout_id = ?';
  const params = [req.params.id, req.user.id];

  if (tier) { query += ' AND potential_tier = ?'; params.push(tier); }
  if (search) { query += ' AND (name LIKE ? OR squad LIKE ?)'; params.push(`%${search}%`, `%${search}%`); }
  if (minScore) { query += ' AND potential_score >= ?'; params.push(parseFloat(minScore)); }

  query += ' ORDER BY potential_score DESC';

  const total = db.prepare(query.replace('SELECT *', 'SELECT COUNT(*)')).get(...params)['COUNT(*)'];
  const players = db.prepare(query + ' LIMIT ? OFFSET ?').all(...params, parseInt(limit), offset);

  res.json({ players, total, page: parseInt(page), pages: Math.ceil(total / parseInt(limit)) });
});

// Delete a dataset
router.delete('/:id', auth, (req, res) => {
  db.prepare('DELETE FROM datasets WHERE id = ? AND scout_id = ?').run(req.params.id, req.user.id);
  res.json({ message: 'Dataset verwijderd.' });
});

module.exports = router;
