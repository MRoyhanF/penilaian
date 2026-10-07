const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');

const DB_PATH = path.join(__dirname, 'penjurian.db');

function initDatabase() {
  const db = new Database(DB_PATH);

  // Enable WAL mode for better performance
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  // Create tables
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'judge',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      display_order INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS participants (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      number INTEGER NOT NULL,
      name TEXT NOT NULL,
      phone TEXT,
      school TEXT,
      project TEXT,
      category_id INTEGER NOT NULL,
      FOREIGN KEY (category_id) REFERENCES categories(id)
    );

    CREATE TABLE IF NOT EXISTS judge_categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      judge_id INTEGER NOT NULL,
      category_id INTEGER NOT NULL,
      FOREIGN KEY (judge_id) REFERENCES users(id),
      FOREIGN KEY (category_id) REFERENCES categories(id),
      UNIQUE(judge_id, category_id)
    );

    CREATE TABLE IF NOT EXISTS criteria (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT NOT NULL,
      name TEXT NOT NULL,
      weight INTEGER NOT NULL,
      max_score INTEGER NOT NULL DEFAULT 100,
      display_order INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS sub_criteria (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      criteria_id INTEGER NOT NULL,
      code TEXT NOT NULL,
      name TEXT NOT NULL,
      detail TEXT,
      min_score INTEGER DEFAULT 0,
      max_score INTEGER DEFAULT 25,
      display_order INTEGER DEFAULT 0,
      FOREIGN KEY (criteria_id) REFERENCES criteria(id)
    );

    CREATE TABLE IF NOT EXISTS scores (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      judge_id INTEGER NOT NULL,
      participant_id INTEGER NOT NULL,
      sub_criteria_id INTEGER NOT NULL,
      score INTEGER NOT NULL DEFAULT 0,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (judge_id) REFERENCES users(id),
      FOREIGN KEY (participant_id) REFERENCES participants(id),
      FOREIGN KEY (sub_criteria_id) REFERENCES sub_criteria(id),
      UNIQUE(judge_id, participant_id, sub_criteria_id)
    );
  `);

  return db;
}

function seedDatabase(db) {
  // Check if data already seeded
  const existingUsers = db.prepare('SELECT COUNT(*) as count FROM users').get();
  if (existingUsers.count > 0) {
    return;
  }

  console.log('Seeding database...');

  // Load JSON data
  const dataJson = JSON.parse(fs.readFileSync(path.join(__dirname, 'data', 'data.json'), 'utf-8'));
  const juriJson = JSON.parse(fs.readFileSync(path.join(__dirname, 'data', 'juri.json'), 'utf-8'));
  const rubrikJson = JSON.parse(fs.readFileSync(path.join(__dirname, 'data', 'rubrik.json'), 'utf-8'));

  const insertUser = db.prepare('INSERT INTO users (name, username, password, role) VALUES (?, ?, ?, ?)');
  const insertCategory = db.prepare('INSERT INTO categories (code, name, display_order) VALUES (?, ?, ?)');
  const insertParticipant = db.prepare('INSERT INTO participants (number, name, phone, school, project, category_id) VALUES (?, ?, ?, ?, ?, ?)');
  const insertJudgeCategory = db.prepare('INSERT INTO judge_categories (judge_id, category_id) VALUES (?, ?)');
  const insertCriteria = db.prepare('INSERT INTO criteria (code, name, weight, max_score, display_order) VALUES (?, ?, ?, ?, ?)');
  const insertSubCriteria = db.prepare('INSERT INTO sub_criteria (criteria_id, code, name, detail, min_score, max_score, display_order) VALUES (?, ?, ?, ?, ?, ?, ?)');

  const transaction = db.transaction(() => {
    // Seed admin
    const adminPassword = bcrypt.hashSync('admin123', 10);
    insertUser.run('Administrator', 'admin', adminPassword, 'admin');

    // Seed judges
    const judgeIds = {};
    for (const judge of juriJson.judges) {
      const password = bcrypt.hashSync(judge.username + '123', 10);
      const result = insertUser.run(judge.name, judge.username, password, 'judge');
      judgeIds[judge.name] = result.lastInsertRowid;
    }

    // Seed categories
    const categoryMap = {
      'starter': 'Starter',
      'beginner': 'Beginner',
      'intermediate': 'Intermediate',
      'senior': 'Senior'
    };

    const categoryIds = {};
    let order = 0;
    for (const [code, name] of Object.entries(categoryMap)) {
      const result = insertCategory.run(code, name, order++);
      categoryIds[code] = result.lastInsertRowid;
    }

    // Seed judge-category relationships
    for (const judge of juriJson.judges) {
      for (const cat of judge.categories) {
        insertJudgeCategory.run(judgeIds[judge.name], categoryIds[cat]);
      }
    }

    // Seed participants
    for (const [categoryCode, categoryData] of Object.entries(dataJson)) {
      const catId = categoryIds[categoryCode];
      for (const participant of categoryData.participants) {
        insertParticipant.run(
          participant.number,
          participant.name,
          participant.phone,
          participant.school,
          participant.project,
          catId
        );
      }
    }

    // Seed criteria and sub-criteria
    let criteriaOrder = 0;
    for (const criteria of rubrikJson.criteria) {
      const result = insertCriteria.run(criteria.code, criteria.name, criteria.weight, criteria.max_score, criteriaOrder++);
      const criteriaId = result.lastInsertRowid;

      let subOrder = 0;
      for (const sub of criteria.sub_criteria) {
        insertSubCriteria.run(criteriaId, sub.code, sub.name, sub.detail, sub.score_range.min, sub.score_range.max, subOrder++);
      }
    }
  });

  transaction();
  console.log('Database seeded successfully!');
}

module.exports = { initDatabase, seedDatabase };
