const express = require('express');
const multer = require('multer');
const Papa = require('papaparse');
const { pool } = require('../database');
const auth = require('../middleware/auth');
const { batchScore } = require('../ai/scorer');

const router = express.Router();

// Use memory storage — no filesystem dependency (works on Vercel)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 },
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
      return res.status(400).json({ error: 'Geen bestand geupload.' });
    }

    const fileContent = req.file.buffer.toString('utf8');
    const parsed = Papa.parse(fileContent, {
      header: true,
      skipEmptyLines: true,
      dynamicTyping: true,
    });

    if (parsed.errors.length > 0 && parsed.data.length === 0) {
      return res.status(400).json({ error: 'CSV kon niet worden gelezen.' });
    }

    const rows = parsed.data;

    const datasetResult = await pool.query(
      'INSERT INTO datasets (scout_id, filename, original_name, row_count) VALUES ($1, $2, $3, $4) RETURNING id',
      [req.user.id, req.file.originalname, req.file.originalname, rows.length]
    );
    const datasetId = datasetResult.rows[0].id;

    const scored = batchScore(rows);

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      for (const p of scored) {
        const nineties = parseFloat(p['90s']) || (parseInt(p.Min || p.minutes) / 90) || 1;
        const goals = parseInt(p.Gls || p.goals) || 0;
        const assists = parseInt(p.Ast || p.assists) || 0;
        const shots = parseInt(p.Sh || p.shots) || 0;
        const sot = parseInt(p.SoT || p.shots_on_target) || 0;

        await client.query(`
          INSERT INTO dataset_players (
            dataset_id, scout_id, name, nation, position, squad, competition,
            age, born, matches_played, starts, minutes, goals, assists,
            yellow_cards, red_cards, shots, shots_on_target, tackles_won,
            interceptions, crosses, fouls_drawn, goals_per_90, assists_per_90,
            sot_percent, potential_score, potential_tier, ai_report, raw_data
          ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27,$28,$29)
        `, [
          datasetId, req.user.id,
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
          goals, assists,
          parseInt(p.CrdY || p.yellow_cards) || 0,
          parseInt(p.CrdR || p.red_cards) || 0,
          shots, sot,
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
          JSON.stringify(p),
        ]);
      }
      await client.query('COMMIT');
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }

    await pool.query('UPDATE datasets SET analyzed = 1 WHERE id = $1', [datasetId]);

    const topTier = scored.filter((p) => p.potential_tier === 'S' || p.potential_tier === 'A').length;
    await pool.query(
      'INSERT INTO notifications (scout_id, title, message, type) VALUES ($1, $2, $3, $4)',
      [
        req.user.id,
        'Dataset geanalyseerd!',
        `"${req.file.originalname}" is geanalyseerd. ${rows.length} spelers verwerkt, waarvan ${topTier} toptalenten (Tier S/A) gevonden.`,
        'success',
      ]
    );

    res.status(201).json({
      datasetId,
      rowCount: rows.length,
      topTalents: topTier,
      message: 'Dataset succesvol geupload en geanalyseerd.',
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Upload mislukt: ' + err.message });
  }
});

module.exports = router;
