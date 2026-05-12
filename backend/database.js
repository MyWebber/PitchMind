const Database = require('better-sqlite3');
const path = require('path');

const DB_PATH = path.join(__dirname, 'pitchmind.db');
const db = new Database(DB_PATH);

// Enable WAL mode for better performance
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

function initDatabase() {
  db.exec(`
    -- Scouts (users)
    CREATE TABLE IF NOT EXISTS scouts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      club TEXT,
      role TEXT DEFAULT 'scout',
      avatar TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Players scouted by scouts
    CREATE TABLE IF NOT EXISTS scouted_players (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      scout_id INTEGER NOT NULL,
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
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (scout_id) REFERENCES scouts(id) ON DELETE CASCADE
    );

    -- Uploaded datasets
    CREATE TABLE IF NOT EXISTS datasets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      scout_id INTEGER NOT NULL,
      filename TEXT NOT NULL,
      original_name TEXT NOT NULL,
      row_count INTEGER DEFAULT 0,
      analyzed INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (scout_id) REFERENCES scouts(id) ON DELETE CASCADE
    );

    -- Players from datasets (analyzed)
    CREATE TABLE IF NOT EXISTS dataset_players (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      dataset_id INTEGER NOT NULL,
      scout_id INTEGER NOT NULL,
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
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (dataset_id) REFERENCES datasets(id) ON DELETE CASCADE,
      FOREIGN KEY (scout_id) REFERENCES scouts(id) ON DELETE CASCADE
    );

    -- Notifications
    CREATE TABLE IF NOT EXISTS notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      scout_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      type TEXT DEFAULT 'info',
      read INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (scout_id) REFERENCES scouts(id) ON DELETE CASCADE
    );
  `);

  console.log('✅ Database initialized');
}

initDatabase();

module.exports = db;
