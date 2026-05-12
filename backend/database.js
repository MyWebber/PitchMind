const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  max: 5,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

async function initDatabase() {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS scouts (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        club TEXT,
        role TEXT DEFAULT 'scout',
        avatar TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS scouted_players (
        id SERIAL PRIMARY KEY,
        scout_id INTEGER NOT NULL REFERENCES scouts(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        nation TEXT,
        position TEXT,
        squad TEXT,
        competition TEXT,
        age REAL,
        born INTEGER,
        matches_played INTEGER DEFAULT 0,
        starts INTEGER DEFAULT 0,
        minutes INTEGER DEFAULT 0,
        goals INTEGER DEFAULT 0,
        assists INTEGER DEFAULT 0,
        yellow_cards INTEGER DEFAULT 0,
        red_cards INTEGER DEFAULT 0,
        shots INTEGER DEFAULT 0,
        shots_on_target INTEGER DEFAULT 0,
        tackles_won INTEGER DEFAULT 0,
        interceptions INTEGER DEFAULT 0,
        crosses INTEGER DEFAULT 0,
        fouls_drawn INTEGER DEFAULT 0,
        goals_per_90 REAL DEFAULT 0,
        assists_per_90 REAL DEFAULT 0,
        sot_percent REAL DEFAULT 0,
        potential_score REAL DEFAULT 0,
        ai_report TEXT,
        status TEXT DEFAULT 'watching',
        notes TEXT,
        starred INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS datasets (
        id SERIAL PRIMARY KEY,
        scout_id INTEGER NOT NULL REFERENCES scouts(id) ON DELETE CASCADE,
        filename TEXT NOT NULL,
        original_name TEXT NOT NULL,
        row_count INTEGER DEFAULT 0,
        analyzed INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS dataset_players (
        id SERIAL PRIMARY KEY,
        dataset_id INTEGER NOT NULL REFERENCES datasets(id) ON DELETE CASCADE,
        scout_id INTEGER NOT NULL REFERENCES scouts(id) ON DELETE CASCADE,
        name TEXT,
        nation TEXT,
        position TEXT,
        squad TEXT,
        competition TEXT,
        age REAL,
        born INTEGER,
        matches_played INTEGER DEFAULT 0,
        starts INTEGER DEFAULT 0,
        minutes INTEGER DEFAULT 0,
        goals INTEGER DEFAULT 0,
        assists INTEGER DEFAULT 0,
        yellow_cards INTEGER DEFAULT 0,
        red_cards INTEGER DEFAULT 0,
        shots INTEGER DEFAULT 0,
        shots_on_target INTEGER DEFAULT 0,
        tackles_won INTEGER DEFAULT 0,
        interceptions INTEGER DEFAULT 0,
        crosses INTEGER DEFAULT 0,
        fouls_drawn INTEGER DEFAULT 0,
        goals_per_90 REAL DEFAULT 0,
        assists_per_90 REAL DEFAULT 0,
        sot_percent REAL DEFAULT 0,
        potential_score REAL DEFAULT 0,
        potential_tier TEXT DEFAULT 'C',
        ai_report TEXT,
        raw_data TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS notifications (
        id SERIAL PRIMARY KEY,
        scout_id INTEGER NOT NULL REFERENCES scouts(id) ON DELETE CASCADE,
        title TEXT NOT NULL,
        message TEXT NOT NULL,
        type TEXT DEFAULT 'info',
        read INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);
    console.log('✅ Database initialized');
  } finally {
    client.release();
  }
}

// Run once; the resolved promise is reused by all subsequent awaits
const dbReady = initDatabase().catch(console.error);

module.exports = { pool, dbReady };
