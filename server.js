/**
 * Local development server
 * 
 * This server is used for LOCAL development only.
 * For production (Vercel), API routes in /api/ folder are used instead.
 * 
 * Usage: node server.js
 */
require('dotenv').config();

const express = require('express');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');
const { supabase } = require('./lib/supabase');
const { generateToken, requireAuth, requireAdmin } = require('./lib/auth');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'dist')));
app.use(express.static(path.join(__dirname, 'public')));

// CORS for local dev
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();
  next();
});

// ==================== AUTH ROUTES ====================

app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;

  const { data: user, error } = await supabase
    .from('users')
    .select('*')
    .eq('username', username)
    .single();

  if (error || !user) {
    return res.status(401).json({ error: 'Username tidak ditemukan' });
  }

  if (!bcrypt.compareSync(password, user.password)) {
    return res.status(401).json({ error: 'Password salah' });
  }

  const token = generateToken(user);
  res.json({
    token,
    user: { id: user.id, name: user.name, username: user.username, role: user.role },
  });
});

app.post('/api/logout', (req, res) => {
  res.json({ success: true });
});

app.get('/api/me', (req, res) => {
  const user = requireAuth(req, res);
  if (!user) return;
  res.json({ user });
});

// ==================== JUDGE ROUTES ====================

app.get('/api/judge/categories', async (req, res) => {
  const user = requireAuth(req, res);
  if (!user) return;

  const { data: judgeCats } = await supabase
    .from('judge_categories')
    .select('category_id')
    .eq('judge_id', user.id);

  const categoryIds = (judgeCats || []).map(jc => jc.category_id);
  if (categoryIds.length === 0) return res.json([]);

  const { data: categories } = await supabase
    .from('categories')
    .select('*')
    .in('id', categoryIds)
    .order('display_order');

  const result = [];
  for (const cat of (categories || [])) {
    const { count: totalParticipants } = await supabase
      .from('participants')
      .select('*', { count: 'exact', head: true })
      .eq('category_id', cat.id);

    const { data: scoredData } = await supabase
      .from('scores')
      .select('participant_id, participants!inner(category_id)')
      .eq('judge_id', user.id)
      .eq('participants.category_id', cat.id);

    const scoredParticipantIds = new Set((scoredData || []).map(s => s.participant_id));

    result.push({
      ...cat,
      total_participants: totalParticipants || 0,
      scored_count: scoredParticipantIds.size,
    });
  }

  res.json(result);
});

app.get('/api/judge/participants', async (req, res) => {
  const user = requireAuth(req, res);
  if (!user) return;

  const { categoryId } = req.query;

  if (user.role !== 'admin') {
    const { data: assigned } = await supabase
      .from('judge_categories')
      .select('id')
      .eq('judge_id', user.id)
      .eq('category_id', categoryId)
      .single();

    if (!assigned) {
      return res.status(403).json({ error: 'Anda tidak ditugaskan ke kategori ini' });
    }
  }

  const { data: category } = await supabase
    .from('categories')
    .select('*')
    .eq('id', categoryId)
    .single();

  const { data: participants } = await supabase
    .from('participants')
    .select('*')
    .eq('category_id', categoryId)
    .order('number');

  const { data: criteria } = await supabase
    .from('criteria')
    .select('*')
    .order('display_order');

  const participantsWithStatus = [];
  for (const p of (participants || [])) {
    const { data: scores } = await supabase
      .from('scores')
      .select('score, sub_criteria_id')
      .eq('judge_id', user.id)
      .eq('participant_id', p.id);

    let hasScored = (scores || []).length > 0;
    let totalScore = 0;

    if (hasScored) {
      const subIds = scores.map(s => s.sub_criteria_id);
      const { data: subCriteria } = await supabase
        .from('sub_criteria')
        .select('id, criteria_id')
        .in('id', subIds);

      const criteriaMap = {};
      for (const s of scores) {
        const sc = (subCriteria || []).find(sub => sub.id === s.sub_criteria_id);
        if (!sc) continue;
        const crit = (criteria || []).find(c => c.id === sc.criteria_id);
        if (!crit) continue;

        if (!criteriaMap[sc.criteria_id]) {
          criteriaMap[sc.criteria_id] = { raw: 0, weight: crit.weight, max: crit.max_score };
        }
        criteriaMap[sc.criteria_id].raw += s.score;
      }

      for (const c of Object.values(criteriaMap)) {
        totalScore += (c.raw / c.max) * c.weight;
      }
      totalScore = Math.round(totalScore * 100) / 100;
    }

    participantsWithStatus.push({
      ...p,
      has_scored: hasScored,
      score_total: totalScore,
    });
  }

  res.json({ category, participants: participantsWithStatus });
});

app.get('/api/judge/scoring', async (req, res) => {
  const user = requireAuth(req, res);
  if (!user) return;

  const { participantId } = req.query;

  const { data: participant } = await supabase
    .from('participants')
    .select('*')
    .eq('id', participantId)
    .single();

  if (!participant) {
    return res.status(404).json({ error: 'Peserta tidak ditemukan' });
  }

  if (user.role !== 'admin') {
    const { data: assigned } = await supabase
      .from('judge_categories')
      .select('id')
      .eq('judge_id', user.id)
      .eq('category_id', participant.category_id)
      .single();

    if (!assigned) {
      return res.status(403).json({ error: 'Anda tidak ditugaskan ke kategori ini' });
    }
  }

  const { data: category } = await supabase
    .from('categories')
    .select('*')
    .eq('id', participant.category_id)
    .single();

  const { data: criteriaList } = await supabase
    .from('criteria')
    .select('*')
    .order('display_order');

  const criteria = [];
  for (const c of (criteriaList || [])) {
    const { data: subCriteria } = await supabase
      .from('sub_criteria')
      .select('*')
      .eq('criteria_id', c.id)
      .order('display_order');
    criteria.push({ ...c, sub_criteria: subCriteria || [] });
  }

  const { data: scores } = await supabase
    .from('scores')
    .select('sub_criteria_id, score')
    .eq('judge_id', user.id)
    .eq('participant_id', participantId);

  const { data: prevP } = await supabase
    .from('participants')
    .select('id')
    .eq('category_id', participant.category_id)
    .lt('number', participant.number)
    .order('number', { ascending: false })
    .limit(1)
    .single();

  const { data: nextP } = await supabase
    .from('participants')
    .select('id')
    .eq('category_id', participant.category_id)
    .gt('number', participant.number)
    .order('number')
    .limit(1)
    .single();

  res.json({
    participant,
    category,
    criteria,
    scores: scores || [],
    prev_participant_id: prevP ? prevP.id : null,
    next_participant_id: nextP ? nextP.id : null,
  });
});

app.get('/api/judge/scores', async (req, res) => {
  const user = requireAuth(req, res);
  if (!user) return;

  const { participantId } = req.query;

  const { data: scores } = await supabase
    .from('scores')
    .select('*, sub_criteria(code, criteria_id)')
    .eq('judge_id', user.id)
    .eq('participant_id', participantId);

  const result = (scores || []).map(s => ({
    ...s,
    sub_criteria_code: s.sub_criteria?.code,
    criteria_id: s.sub_criteria?.criteria_id,
  }));

  res.json(result);
});

app.post('/api/judge/scores', async (req, res) => {
  const user = requireAuth(req, res);
  if (!user) return;

  const { participant_id, scores } = req.body;
  if (!participant_id || !scores || !Array.isArray(scores)) {
    return res.status(400).json({ error: 'Data tidak lengkap' });
  }

  try {
    for (const s of scores) {
      const { data: subCriteria } = await supabase
        .from('sub_criteria')
        .select('*')
        .eq('id', s.sub_criteria_id)
        .single();
      if (!subCriteria) continue;

      const score = Math.max(subCriteria.min_score, Math.min(subCriteria.max_score, parseInt(s.score) || 0));
      await supabase.from('scores').upsert({
        judge_id: user.id,
        participant_id: participant_id,
        sub_criteria_id: s.sub_criteria_id,
        score: score,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'judge_id,participant_id,sub_criteria_id' });
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Gagal menyimpan nilai: ' + err.message });
  }
});

// ==================== ADMIN ROUTES ====================

app.get('/api/criteria', async (req, res) => {
  const user = requireAuth(req, res);
  if (!user) return;

  const { data: criteriaList } = await supabase
    .from('criteria')
    .select('*')
    .order('display_order');

  const result = [];
  for (const c of (criteriaList || [])) {
    const { data: subCriteria } = await supabase
      .from('sub_criteria')
      .select('*')
      .eq('criteria_id', c.id)
      .order('display_order');
    result.push({ ...c, sub_criteria: subCriteria || [] });
  }

  res.json(result);
});

app.get('/api/admin/dashboard', async (req, res) => {
  const user = requireAdmin(req, res);
  if (!user) return;

  const { count: totalParticipants } = await supabase.from('participants').select('*', { count: 'exact', head: true });
  const { count: totalJudges } = await supabase.from('users').select('*', { count: 'exact', head: true }).eq('role', 'judge');
  const { count: totalCategories } = await supabase.from('categories').select('*', { count: 'exact', head: true });

  const { data: allScores } = await supabase.from('scores').select('judge_id, participant_id');
  const uniqueScored = new Set((allScores || []).map(s => `${s.judge_id}-${s.participant_id}`));

  const { data: judgeCategories } = await supabase.from('judge_categories').select('judge_id, category_id');
  let expectedScores = 0;
  const catPCounts = {};
  for (const jc of (judgeCategories || [])) {
    if (!catPCounts[jc.category_id]) {
      const { count } = await supabase.from('participants').select('*', { count: 'exact', head: true }).eq('category_id', jc.category_id);
      catPCounts[jc.category_id] = count || 0;
    }
    expectedScores += catPCounts[jc.category_id];
  }

  const { data: categories } = await supabase.from('categories').select('*').order('display_order');
  const categoryStats = [];
  for (const cat of (categories || [])) {
    const { count: participantCount } = await supabase.from('participants').select('*', { count: 'exact', head: true }).eq('category_id', cat.id);
    const { data: catScores } = await supabase.from('scores').select('judge_id, participant_id, participants!inner(category_id)').eq('participants.category_id', cat.id);
    const catUnique = new Set((catScores || []).map(s => `${s.judge_id}-${s.participant_id}`));
    const catJudges = (judgeCategories || []).filter(jc => jc.category_id === cat.id);

    categoryStats.push({
      id: cat.id, code: cat.code, name: cat.name,
      participant_count: participantCount || 0,
      scored_count: catUnique.size,
      expected_count: catJudges.length * (participantCount || 0),
    });
  }

  res.json({
    totalParticipants: totalParticipants || 0,
    totalJudges: totalJudges || 0,
    totalCategories: totalCategories || 0,
    totalScoresSubmitted: uniqueScored.size,
    expectedScores,
    completionRate: expectedScores > 0 ? Math.round((uniqueScored.size / expectedScores) * 100) : 0,
    categoryStats,
  });
});

app.get('/api/admin/categories', async (req, res) => {
  const user = requireAdmin(req, res);
  if (!user) return;
  const { data } = await supabase.from('categories').select('*').order('display_order');
  res.json(data || []);
});

app.get('/api/admin/judges', async (req, res) => {
  const user = requireAdmin(req, res);
  if (!user) return;

  const { data: judges } = await supabase.from('users').select('id, name, username, created_at').eq('role', 'judge').order('id');
  const result = [];
  for (const j of (judges || [])) {
    const { data: assignedCats } = await supabase.from('judge_categories').select('category_id, categories(id, code, name)').eq('judge_id', j.id);
    const cats = (assignedCats || []).map(ac => ({ id: ac.categories.id, code: ac.categories.code, name: ac.categories.name }));
    const { data: scoredData } = await supabase.from('scores').select('participant_id').eq('judge_id', j.id);
    const scoredIds = new Set((scoredData || []).map(s => s.participant_id));
    const catIds = cats.map(c => c.id);
    let totalP = 0;
    if (catIds.length > 0) {
      const { count } = await supabase.from('participants').select('*', { count: 'exact', head: true }).in('category_id', catIds);
      totalP = count || 0;
    }
    result.push({
      ...j, categories: cats, category_ids: catIds,
      categories_label: cats.map(c => c.name).join(', '),
      scored_count: scoredIds.size, total_participants: totalP,
    });
  }
  res.json(result);
});

app.post('/api/admin/judges', async (req, res) => {
  const user = requireAdmin(req, res);
  if (!user) return;

  const { name, username, password, category_ids } = req.body;
  if (!name || !username || !password) return res.status(400).json({ error: 'Nama, username, dan password wajib diisi' });

  const cleanUsername = username.trim().toLowerCase();
  const { data: existing } = await supabase.from('users').select('id').eq('username', cleanUsername).single();
  if (existing) return res.status(400).json({ error: 'Username sudah digunakan oleh akun lain' });

  const hashed = bcrypt.hashSync(password, 10);
  const { data: newUser, error: insertErr } = await supabase.from('users').insert({ name: name.trim(), username: cleanUsername, password: hashed, role: 'judge' }).select('id').single();
  if (insertErr) return res.status(500).json({ error: 'Gagal menambahkan juri: ' + insertErr.message });

  if (Array.isArray(category_ids) && category_ids.length > 0) {
    await supabase.from('judge_categories').insert(category_ids.map(catId => ({ judge_id: newUser.id, category_id: Number(catId) })));
  }
  res.json({ success: true, id: newUser.id, message: 'Juri baru berhasil ditambahkan' });
});

app.put('/api/admin/judges/:id', async (req, res) => {
  const user = requireAdmin(req, res);
  if (!user) return;

  const { id } = req.params;
  const { name, username, password, category_ids } = req.body;

  const { data: judge } = await supabase.from('users').select('*').eq('id', id).eq('role', 'judge').single();
  if (!judge) return res.status(404).json({ error: 'Data juri tidak ditemukan' });
  if (!name || !username) return res.status(400).json({ error: 'Nama dan username tidak boleh kosong' });

  const cleanUsername = username.trim().toLowerCase();
  const { data: dup } = await supabase.from('users').select('id').eq('username', cleanUsername).neq('id', id).single();
  if (dup) return res.status(400).json({ error: 'Username sudah digunakan oleh akun lain' });

  try {
    const updateData = { name: name.trim(), username: cleanUsername };
    if (password && password.trim().length > 0) updateData.password = bcrypt.hashSync(password.trim(), 10);
    await supabase.from('users').update(updateData).eq('id', id);
    await supabase.from('judge_categories').delete().eq('judge_id', id);
    if (Array.isArray(category_ids) && category_ids.length > 0) {
      await supabase.from('judge_categories').insert(category_ids.map(catId => ({ judge_id: Number(id), category_id: Number(catId) })));
    }
    res.json({ success: true, message: 'Data juri berhasil diperbarui' });
  } catch (err) {
    res.status(500).json({ error: 'Gagal memperbarui juri: ' + err.message });
  }
});

app.delete('/api/admin/judges/:id', async (req, res) => {
  const user = requireAdmin(req, res);
  if (!user) return;

  const { id } = req.params;
  const { data: judge } = await supabase.from('users').select('*').eq('id', id).eq('role', 'judge').single();
  if (!judge) return res.status(404).json({ error: 'Data juri tidak ditemukan' });

  try {
    await supabase.from('scores').delete().eq('judge_id', id);
    await supabase.from('judge_categories').delete().eq('judge_id', id);
    await supabase.from('users').delete().eq('id', id);
    res.json({ success: true, message: `Akun juri ${judge.name} berhasil dihapus` });
  } catch (err) {
    res.status(500).json({ error: 'Gagal menghapus juri: ' + err.message });
  }
});

app.post('/api/admin/reset-scores', async (req, res) => {
  const user = requireAdmin(req, res);
  if (!user) return;

  const { scope, category_id, participant_id } = req.body;
  try {
    if (scope === 'all') {
      await supabase.from('scores').delete().neq('id', 0);
      return res.json({ success: true, message: 'Semua nilai penjurian berhasil direset' });
    } else if (scope === 'category' && category_id) {
      const { data: participants } = await supabase.from('participants').select('id').eq('category_id', category_id);
      const pIds = (participants || []).map(p => p.id);
      if (pIds.length > 0) await supabase.from('scores').delete().in('participant_id', pIds);
      return res.json({ success: true, message: 'Nilai kategori berhasil direset' });
    } else if (scope === 'participant' && participant_id) {
      await supabase.from('scores').delete().eq('participant_id', participant_id);
      return res.json({ success: true, message: 'Nilai peserta berhasil direset' });
    } else {
      return res.status(400).json({ error: 'Scope reset tidak valid' });
    }
  } catch (err) {
    return res.status(500).json({ error: 'Gagal mereset nilai: ' + err.message });
  }
});

app.get('/api/admin/results', async (req, res) => {
  const user = requireAdmin(req, res);
  if (!user) return;

  const { data: categories } = await supabase.from('categories').select('*').order('display_order');
  const { data: criteria } = await supabase.from('criteria').select('*').order('display_order');
  const allResults = {};

  for (const cat of (categories || [])) {
    const { data: participants } = await supabase.from('participants').select('*').eq('category_id', cat.id).order('number');
    const { data: judgeCats } = await supabase.from('judge_categories').select('judge_id').eq('category_id', cat.id);
    const judgeIds = (judgeCats || []).map(jc => jc.judge_id);
    const { data: judges } = judgeIds.length > 0
      ? await supabase.from('users').select('id, name').eq('role', 'judge').in('id', judgeIds)
      : { data: [] };

    const results = [];
    for (const p of (participants || [])) {
      const judgeScores = [];
      for (const j of (judges || [])) {
        const { data: scores } = await supabase.from('scores').select('score, sub_criteria_id').eq('judge_id', j.id).eq('participant_id', p.id);
        let total = 0;
        const hasScored = (scores || []).length > 0;
        if (hasScored) {
          const subIds = scores.map(s => s.sub_criteria_id);
          const { data: subCriteria } = await supabase.from('sub_criteria').select('id, criteria_id').in('id', subIds);
          const criteriaMap = {};
          for (const s of scores) {
            const sc = (subCriteria || []).find(sub => sub.id === s.sub_criteria_id);
            if (!sc) continue;
            const crit = (criteria || []).find(c => c.id === sc.criteria_id);
            if (!crit) continue;
            if (!criteriaMap[sc.criteria_id]) criteriaMap[sc.criteria_id] = { raw: 0, weight: crit.weight, max: crit.max_score };
            criteriaMap[sc.criteria_id].raw += s.score;
          }
          for (const c of Object.values(criteriaMap)) total += (c.raw / c.max) * c.weight;
        }
        judgeScores.push({ judge_id: j.id, judge_name: j.name, total: Math.round(total * 100) / 100, has_scored: hasScored });
      }
      const scored = judgeScores.filter(j => j.has_scored);
      const avg = scored.length > 0 ? Math.round((scored.reduce((s, j) => s + j.total, 0) / scored.length) * 100) / 100 : 0;
      results.push({ ...p, judge_scores: judgeScores, average: avg });
    }
    results.sort((a, b) => b.average - a.average);
    results.forEach((r, i) => { r.rank = r.average > 0 ? i + 1 : '-'; });
    allResults[cat.code] = { ...cat, judges: judges || [], results };
  }

  res.json(allResults);
});

app.get('/api/admin/results/:categoryId', async (req, res) => {
  const user = requireAdmin(req, res);
  if (!user) return;

  const { categoryId } = req.params;
  const { data: participants } = await supabase.from('participants').select('*').eq('category_id', categoryId).order('number');
  const { data: judgeCats } = await supabase.from('judge_categories').select('judge_id').eq('category_id', categoryId);
  const judgeIds = (judgeCats || []).map(jc => jc.judge_id);
  const { data: judges } = judgeIds.length > 0 ? await supabase.from('users').select('id, name').eq('role', 'judge').in('id', judgeIds) : { data: [] };
  const { data: criteria } = await supabase.from('criteria').select('*').order('display_order');
  const { data: subCriteria } = await supabase.from('sub_criteria').select('*').order('criteria_id, display_order');

  const results = [];
  for (const p of (participants || [])) {
    const judgeScores = [];
    for (const j of (judges || [])) {
      const { data: scores } = await supabase.from('scores').select('score, sub_criteria_id, sub_criteria(code, name, criteria_id)').eq('judge_id', j.id).eq('participant_id', p.id);
      let totalWeighted = 0;
      const criteriaScores = {};
      const hasScored = (scores || []).length > 0;
      for (const s of (scores || [])) {
        const sc = s.sub_criteria;
        if (!sc) continue;
        const crit = (criteria || []).find(c => c.id === sc.criteria_id);
        if (!crit) continue;
        if (!criteriaScores[crit.code]) criteriaScores[crit.code] = { name: crit.name, weight: crit.weight, raw_total: 0, max: 100, subs: [] };
        criteriaScores[crit.code].raw_total += s.score;
        criteriaScores[crit.code].subs.push({ code: sc.code, name: sc.name, score: s.score });
      }
      for (const cs of Object.values(criteriaScores)) totalWeighted += (cs.raw_total / cs.max) * cs.weight;
      judgeScores.push({ judge_id: j.id, judge_name: j.name, scores: (scores || []).map(s => ({ score: s.score, sub_code: s.sub_criteria?.code, sub_name: s.sub_criteria?.name, criteria_id: s.sub_criteria?.criteria_id })), criteria_scores: criteriaScores, total_weighted: Math.round(totalWeighted * 100) / 100, has_scored: hasScored });
    }
    const scoredJudges = judgeScores.filter(js => js.has_scored);
    const averageScore = scoredJudges.length > 0 ? Math.round((scoredJudges.reduce((sum, js) => sum + js.total_weighted, 0) / scoredJudges.length) * 100) / 100 : 0;
    results.push({ ...p, judge_scores: judgeScores, average_score: averageScore, is_complete: scoredJudges.length === (judges || []).length });
  }
  results.sort((a, b) => b.average_score - a.average_score);
  results.forEach((r, i) => { r.rank = r.average_score > 0 ? i + 1 : '-'; });
  res.json({ participants: results, judges: judges || [], criteria: criteria || [], subCriteria: subCriteria || [] });
});

app.get('/api/admin/all-results', async (req, res) => {
  const user = requireAdmin(req, res);
  if (!user) return;

  const { data: categories } = await supabase.from('categories').select('*').order('display_order');
  const { data: criteria } = await supabase.from('criteria').select('*').order('display_order');
  const allResults = {};

  for (const cat of (categories || [])) {
    const { data: participants } = await supabase.from('participants').select('*').eq('category_id', cat.id).order('number');
    const { data: judgeCats } = await supabase.from('judge_categories').select('judge_id').eq('category_id', cat.id);
    const judgeIds = (judgeCats || []).map(jc => jc.judge_id);
    const { data: judges } = judgeIds.length > 0 ? await supabase.from('users').select('id, name').eq('role', 'judge').in('id', judgeIds) : { data: [] };

    const results = [];
    for (const p of (participants || [])) {
      const judgeScores = [];
      for (const j of (judges || [])) {
        const { data: scores } = await supabase.from('scores').select('score, sub_criteria_id').eq('judge_id', j.id).eq('participant_id', p.id);
        let total = 0;
        const hasScored = (scores || []).length > 0;
        if (hasScored) {
          const subIds = scores.map(s => s.sub_criteria_id);
          const { data: subCriteria } = await supabase.from('sub_criteria').select('id, criteria_id').in('id', subIds);
          const criteriaMap = {};
          for (const s of scores) {
            const sc = (subCriteria || []).find(sub => sub.id === s.sub_criteria_id);
            if (!sc) continue;
            const crit = (criteria || []).find(c => c.id === sc.criteria_id);
            if (!crit) continue;
            if (!criteriaMap[sc.criteria_id]) criteriaMap[sc.criteria_id] = { raw: 0, weight: crit.weight, max: crit.max_score };
            criteriaMap[sc.criteria_id].raw += s.score;
          }
          for (const c of Object.values(criteriaMap)) total += (c.raw / c.max) * c.weight;
        }
        judgeScores.push({ judge_name: j.name, total: Math.round(total * 100) / 100, has_scored: hasScored });
      }
      const scored = judgeScores.filter(j => j.has_scored);
      const avg = scored.length > 0 ? Math.round((scored.reduce((s, j) => s + j.total, 0) / scored.length) * 100) / 100 : 0;
      results.push({ ...p, judge_scores: judgeScores, average: avg });
    }
    results.sort((a, b) => b.average - a.average);
    results.forEach((r, i) => { r.rank = r.average > 0 ? i + 1 : '-'; });
    allResults[cat.code] = { ...cat, results };
  }
  res.json(allResults);
});

// ==================== SERVE SPA ====================

app.get('/{*path}', (req, res) => {
  const distIndex = path.join(__dirname, 'dist', 'index.html');
  if (fs.existsSync(distIndex)) {
    return res.sendFile(distIndex);
  }
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`\n🏆 Sistem Penjurian berjalan di http://localhost:${PORT}\n`);
  console.log('Menggunakan Supabase sebagai database');
  console.log('Pastikan .env sudah dikonfigurasi dengan benar\n');
  console.log('Default accounts:');
  console.log('  Admin   → username: admin, password: admin123');
  console.log('  Juri 1  → username: eko, password: eko123');
  console.log('  Juri 2  → username: husna, password: husna123');
  console.log('  Juri 3  → username: royhan, password: royhan123');
  console.log('  Juri 4  → username: laylin, password: laylin123');
  console.log('');
});
