const { supabase } = require('../../lib/supabase');
const { requireAuth } = require('../../lib/auth');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const user = requireAuth(req, res);
  if (!user) return;

  const { categoryId } = req.query;

  // Check if judge is assigned to this category
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

  // Get criteria for weighted calculations
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
      // Get sub_criteria with their criteria info
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

  res.json({
    category,
    participants: participantsWithStatus,
  });
};
