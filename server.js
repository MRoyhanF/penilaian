const express = require('express');
const session = require('express-session');
const path = require('path');
const bcrypt = require('bcryptjs');
const { initDatabase, seedDatabase } = require('./database');

const app = express();
const PORT = 3000;

// Initialize database
const db = initDatabase();
seedDatabase(db);

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.use(session({
  secret: 'juri-secret-key-2026',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 24 * 60 * 60 * 1000 } // 24 hours
}));

// Auth middleware
function requireAuth(req, res, next) {
  if (!req.session.user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
}

function requireAdmin(req, res, next) {
  if (!req.session.user || req.session.user.role !== 'admin') {
    return res.status(403).json({ error: 'Forbidden' });
  }
  next();
}

// ==================== AUTH ROUTES ====================

app.post('/api/login', (req, res) => {
  const { username, password } = req.body;

  const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
  if (!user) {
    return res.status(401).json({ error: 'Username tidak ditemukan' });
  }

  if (!bcrypt.compareSync(password, user.password)) {
    return res.status(401).json({ error: 'Password salah' });
  }

  req.session.user = {
    id: user.id,
    name: user.name,
    username: user.username,
    role: user.role
  };

  res.json({ user: req.session.user });
});

app.post('/api/logout', (req, res) => {
  req.session.destroy();
  res.json({ success: true });
});

app.get('/api/me', (req, res) => {
  if (!req.session.user) {
    return res.status(401).json({ error: 'Not logged in' });
  }
  res.json({ user: req.session.user });
});

// ==================== JUDGE ROUTES ====================

// Get categories assigned to current judge
app.get('/api/judge/categories', requireAuth, (req, res) => {
  const categories = db.prepare(`
    SELECT c.* FROM categories c
    JOIN judge_categories jc ON jc.category_id = c.id
    WHERE jc.judge_id = ?
    ORDER BY c.display_order
  `).all(req.session.user.id);

  res.json(categories);
});

// Get participants for a category
app.get('/api/judge/participants/:categoryId', requireAuth, (req, res) => {
  const { categoryId } = req.params;

  // Check if judge is assigned to this category
  const assigned = db.prepare(`
    SELECT 1 FROM judge_categories WHERE judge_id = ? AND category_id = ?
  `).get(req.session.user.id, categoryId);

  if (!assigned && req.session.user.role !== 'admin') {
    return res.status(403).json({ error: 'Anda tidak ditugaskan ke kategori ini' });
  }

  const participants = db.prepare(`
    SELECT p.*, 
      COALESCE(
        (SELECT GROUP_CONCAT(s.score) FROM scores s 
         JOIN sub_criteria sc ON s.sub_criteria_id = sc.id 
         WHERE s.participant_id = p.id AND s.judge_id = ?),
        ''
      ) as has_scores
    FROM participants p
    WHERE p.category_id = ?
    ORDER BY p.number
  `).all(req.session.user.id, categoryId);

  // Check if judge has scored each participant
  const participantsWithStatus = participants.map(p => {
    const scoreCount = db.prepare(`
      SELECT COUNT(*) as count FROM scores 
      WHERE judge_id = ? AND participant_id = ?
    `).get(req.session.user.id, p.id);

    return {
      ...p,
      scored: scoreCount.count > 0,
      score_count: scoreCount.count
    };
  });

  res.json(participantsWithStatus);
});

// Get rubrik/criteria
app.get('/api/criteria', requireAuth, (req, res) => {
  const criteria = db.prepare('SELECT * FROM criteria ORDER BY display_order').all();

  const result = criteria.map(c => {
    const subCriteria = db.prepare('SELECT * FROM sub_criteria WHERE criteria_id = ? ORDER BY display_order').all(c.id);
    return { ...c, sub_criteria: subCriteria };
  });

  res.json(result);
});

// Get scores for a participant by current judge
app.get('/api/judge/scores/:participantId', requireAuth, (req, res) => {
  const { participantId } = req.params;

  const scores = db.prepare(`
    SELECT s.*, sc.code as sub_criteria_code, sc.criteria_id
    FROM scores s
    JOIN sub_criteria sc ON s.sub_criteria_id = sc.id
    WHERE s.judge_id = ? AND s.participant_id = ?
  `).all(req.session.user.id, participantId);

  res.json(scores);
});

// Save scores for a participant
app.post('/api/judge/scores', requireAuth, (req, res) => {
  const { participant_id, scores } = req.body;
  const judge_id = req.session.user.id;

  if (!participant_id || !scores || !Array.isArray(scores)) {
    return res.status(400).json({ error: 'Data tidak lengkap' });
  }

  const upsert = db.prepare(`
    INSERT INTO scores (judge_id, participant_id, sub_criteria_id, score, updated_at)
    VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(judge_id, participant_id, sub_criteria_id)
    DO UPDATE SET score = excluded.score, updated_at = CURRENT_TIMESTAMP
  `);

  const transaction = db.transaction(() => {
    for (const s of scores) {
      // Validate score range
      const subCriteria = db.prepare('SELECT * FROM sub_criteria WHERE id = ?').get(s.sub_criteria_id);
      if (!subCriteria) continue;
      
      const score = Math.max(subCriteria.min_score, Math.min(subCriteria.max_score, parseInt(s.score) || 0));
      upsert.run(judge_id, participant_id, s.sub_criteria_id, score);
    }
  });

  try {
    transaction();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Gagal menyimpan nilai: ' + err.message });
  }
});

// ==================== ADMIN ROUTES ====================

// Get all categories
app.get('/api/admin/categories', requireAdmin, (req, res) => {
  const categories = db.prepare('SELECT * FROM categories ORDER BY display_order').all();
  res.json(categories);
});

// Get all judges
app.get('/api/admin/judges', requireAdmin, (req, res) => {
  const judges = db.prepare(`
    SELECT u.id, u.name, u.username, 
      GROUP_CONCAT(c.name, ', ') as categories
    FROM users u
    LEFT JOIN judge_categories jc ON jc.judge_id = u.id
    LEFT JOIN categories c ON c.id = jc.category_id
    WHERE u.role = 'judge'
    GROUP BY u.id
    ORDER BY u.id
  `).all();

  res.json(judges);
});

// Get dashboard stats
app.get('/api/admin/dashboard', requireAdmin, (req, res) => {
  const totalParticipants = db.prepare('SELECT COUNT(*) as count FROM participants').get().count;
  const totalJudges = db.prepare("SELECT COUNT(*) as count FROM users WHERE role = 'judge'").get().count;
  const totalCategories = db.prepare('SELECT COUNT(*) as count FROM categories').get().count;
  const totalScoresSubmitted = db.prepare('SELECT COUNT(DISTINCT judge_id || "-" || participant_id) as count FROM scores').get().count;

  // Total expected = judges * their participants (each judge has assigned categories)
  const expectedScores = db.prepare(`
    SELECT COUNT(*) as count FROM (
      SELECT jc.judge_id, p.id as participant_id
      FROM judge_categories jc
      JOIN participants p ON p.category_id = jc.category_id
    )
  `).get().count;

  // Per category stats
  const categoryStats = db.prepare(`
    SELECT 
      c.id, c.code, c.name,
      (SELECT COUNT(*) FROM participants WHERE category_id = c.id) as participant_count,
      (SELECT COUNT(DISTINCT s.judge_id || '-' || s.participant_id) 
       FROM scores s 
       JOIN participants p ON s.participant_id = p.id 
       WHERE p.category_id = c.id) as scored_count,
      (SELECT COUNT(*) FROM (
        SELECT jc.judge_id, p2.id
        FROM judge_categories jc
        JOIN participants p2 ON p2.category_id = jc.category_id
        WHERE jc.category_id = c.id
      )) as expected_count
    FROM categories c
    ORDER BY c.display_order
  `).all();

  res.json({
    totalParticipants,
    totalJudges,
    totalCategories,
    totalScoresSubmitted,
    expectedScores,
    completionRate: expectedScores > 0 ? Math.round((totalScoresSubmitted / expectedScores) * 100) : 0,
    categoryStats
  });
});

// Get all participants with scores for a category
app.get('/api/admin/results/:categoryId', requireAdmin, (req, res) => {
  const { categoryId } = req.params;

  const participants = db.prepare(`
    SELECT p.* FROM participants p
    WHERE p.category_id = ?
    ORDER BY p.number
  `).all(categoryId);

  const judges = db.prepare(`
    SELECT u.id, u.name FROM users u
    JOIN judge_categories jc ON jc.judge_id = u.id
    WHERE jc.category_id = ? AND u.role = 'judge'
  `).all(categoryId);

  const criteria = db.prepare('SELECT * FROM criteria ORDER BY display_order').all();
  const subCriteria = db.prepare('SELECT * FROM sub_criteria ORDER BY criteria_id, display_order').all();

  const results = participants.map(p => {
    const judgeScores = judges.map(j => {
      const scores = db.prepare(`
        SELECT s.score, sc.code as sub_code, sc.name as sub_name, 
               sc.criteria_id, c.code as criteria_code, c.name as criteria_name, c.weight
        FROM scores s
        JOIN sub_criteria sc ON s.sub_criteria_id = sc.id
        JOIN criteria c ON sc.criteria_id = c.id
        WHERE s.judge_id = ? AND s.participant_id = ?
        ORDER BY c.display_order, sc.display_order
      `).all(j.id, p.id);

      // Calculate weighted total per criteria
      let totalWeighted = 0;
      const criteriaScores = {};

      for (const s of scores) {
        if (!criteriaScores[s.criteria_code]) {
          criteriaScores[s.criteria_code] = {
            name: s.criteria_name,
            weight: s.weight,
            raw_total: 0,
            max: 100,
            subs: []
          };
        }
        criteriaScores[s.criteria_code].raw_total += s.score;
        criteriaScores[s.criteria_code].subs.push({
          code: s.sub_code,
          name: s.sub_name,
          score: s.score
        });
      }

      for (const [code, cs] of Object.entries(criteriaScores)) {
        totalWeighted += (cs.raw_total / cs.max) * cs.weight;
      }

      return {
        judge_id: j.id,
        judge_name: j.name,
        scores,
        criteria_scores: criteriaScores,
        total_weighted: Math.round(totalWeighted * 100) / 100,
        has_scored: scores.length > 0
      };
    });

    // Average of all judges
    const scoredJudges = judgeScores.filter(js => js.has_scored);
    const averageScore = scoredJudges.length > 0
      ? Math.round((scoredJudges.reduce((sum, js) => sum + js.total_weighted, 0) / scoredJudges.length) * 100) / 100
      : 0;

    return {
      ...p,
      judge_scores: judgeScores,
      average_score: averageScore,
      is_complete: scoredJudges.length === judges.length
    };
  });

  // Sort by average score descending
  results.sort((a, b) => b.average_score - a.average_score);

  // Add ranking
  results.forEach((r, i) => {
    r.rank = r.average_score > 0 ? i + 1 : '-';
  });

  res.json({ participants: results, judges, criteria, subCriteria });
});

// Get all results for export/overall view
app.get('/api/admin/all-results', requireAdmin, (req, res) => {
  const categories = db.prepare('SELECT * FROM categories ORDER BY display_order').all();
  const allResults = {};

  for (const cat of categories) {
    const participants = db.prepare('SELECT * FROM participants WHERE category_id = ? ORDER BY number').all(cat.id);
    const judges = db.prepare(`
      SELECT u.id, u.name FROM users u
      JOIN judge_categories jc ON jc.judge_id = u.id
      WHERE jc.category_id = ? AND u.role = 'judge'
    `).all(cat.id);

    const results = participants.map(p => {
      const judgeScores = judges.map(j => {
        const scores = db.prepare(`
          SELECT s.score, sc.criteria_id, c.weight, c.max_score
          FROM scores s
          JOIN sub_criteria sc ON s.sub_criteria_id = sc.id
          JOIN criteria c ON sc.criteria_id = c.id
          WHERE s.judge_id = ? AND s.participant_id = ?
        `).all(j.id, p.id);

        const criteriaMap = {};
        for (const s of scores) {
          if (!criteriaMap[s.criteria_id]) {
            criteriaMap[s.criteria_id] = { raw: 0, weight: s.weight, max: s.max_score };
          }
          criteriaMap[s.criteria_id].raw += s.score;
        }

        let total = 0;
        for (const c of Object.values(criteriaMap)) {
          total += (c.raw / c.max) * c.weight;
        }

        return { judge_name: j.name, total: Math.round(total * 100) / 100, has_scored: scores.length > 0 };
      });

      const scored = judgeScores.filter(j => j.has_scored);
      const avg = scored.length > 0 ? Math.round((scored.reduce((s, j) => s + j.total, 0) / scored.length) * 100) / 100 : 0;

      return { ...p, judge_scores: judgeScores, average: avg };
    });

    results.sort((a, b) => b.average - a.average);
    results.forEach((r, i) => { r.rank = r.average > 0 ? i + 1 : '-'; });

    allResults[cat.code] = { ...cat, results };
  }

  res.json(allResults);
});

// ==================== SERVE SPA ====================

app.get('/{*path}', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`\n🏆 Sistem Penjurian berjalan di http://localhost:${PORT}\n`);
  console.log('Default accounts:');
  console.log('  Admin   → username: admin, password: admin123');
  console.log('  Juri 1  → username: eko, password: eko123');
  console.log('  Juri 2  → username: husna, password: husna123');
  console.log('  Juri 3  → username: royhan, password: royhan123');
  console.log('  Juri 4  → username: laylin, password: laylin123');
  console.log('');
});
