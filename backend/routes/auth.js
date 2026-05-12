const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { pool } = require('../database');

const router = express.Router();
const SALT_ROUNDS = 12;

// Register
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, club } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email and password are required.' });
    }

    const existing = await pool.query('SELECT id FROM scouts WHERE email = $1', [email]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'Email already registered.' });
    }

    const hashed = await bcrypt.hash(password, SALT_ROUNDS);
    const result = await pool.query(
      'INSERT INTO scouts (name, email, password, club) VALUES ($1, $2, $3, $4) RETURNING id',
      [name, email, hashed, club || null]
    );
    const newId = result.rows[0].id;

    // Welcome notification
    await pool.query(
      'INSERT INTO notifications (scout_id, title, message, type) VALUES ($1, $2, $3, $4)',
      [newId, 'Welkom bij PitchMind!', `Hallo ${name}, jouw scouting account is aangemaakt. Begin met het uploaden van een spelerslijst.`, 'success']
    );

    const token = jwt.sign(
      { id: newId, email, name, role: 'scout' },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(201).json({
      token,
      user: { id: newId, name, email, club, role: 'scout' }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error during registration.' });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    const result = await pool.query('SELECT * FROM scouts WHERE email = $1', [email]);
    const scout = result.rows[0];
    if (!scout) {
      return res.status(401).json({ error: 'Ongeldige inloggegevens.' });
    }

    const valid = await bcrypt.compare(password, scout.password);
    if (!valid) {
      return res.status(401).json({ error: 'Ongeldige inloggegevens.' });
    }

    const token = jwt.sign(
      { id: scout.id, email: scout.email, name: scout.name, role: scout.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      token,
      user: { id: scout.id, name: scout.name, email: scout.email, club: scout.club, role: scout.role, avatar: scout.avatar }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error during login.' });
  }
});

// Get current user profile
router.get('/me', require('../middleware/auth'), async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, name, email, club, role, avatar, created_at FROM scouts WHERE id = $1',
      [req.user.id]
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'User not found.' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Server error.' });
  }
});

// Update profile
router.put('/me', require('../middleware/auth'), async (req, res) => {
  try {
    const { name, club, avatar } = req.body;
    await pool.query(
      'UPDATE scouts SET name = $1, club = $2, avatar = $3 WHERE id = $4',
      [name, club, avatar, req.user.id]
    );
    const updated = await pool.query(
      'SELECT id, name, email, club, role, avatar FROM scouts WHERE id = $1',
      [req.user.id]
    );
    res.json(updated.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Update failed.' });
  }
});

// Change password
router.put('/me/password', require('../middleware/auth'), async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const result = await pool.query('SELECT * FROM scouts WHERE id = $1', [req.user.id]);
    const scout = result.rows[0];
    const valid = await bcrypt.compare(currentPassword, scout.password);
    if (!valid) return res.status(401).json({ error: 'Huidig wachtwoord onjuist.' });

    const hashed = await bcrypt.hash(newPassword, SALT_ROUNDS);
    await pool.query('UPDATE scouts SET password = $1 WHERE id = $2', [hashed, req.user.id]);
    res.json({ message: 'Wachtwoord succesvol gewijzigd.' });
  } catch (err) {
    res.status(500).json({ error: 'Password change failed.' });
  }
});

module.exports = router;
