const { supabase } = require('../../lib/supabase');
const { requireAdmin } = require('../../lib/auth');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const user = requireAdmin(req, res);
  if (!user) return;

  const { data: categories } = await supabase
    .from('categories')
    .select('*')
    .order('display_order');

  const { data: criteria } = await supabase
    .from('criteria')
    .select('*')
    .order('display_order');

  const allResults = {};

  for (const cat of (categories || [])) {
    const { data: participants } = await supabase
      .from('participants')
      .select('*')
      .eq('category_id', cat.id)
      .order('number');

    const { data: judgeCats } = await supabase
      .from('judge_categories')
      .select('judge_id')
      .eq('category_id', cat.id);

    const judgeIds = (judgeCats || []).map(jc => jc.judge_id);

    const { data: judges } = judgeIds.length > 0
      ? await supabase.from('users').select('id, name').eq('role', 'judge').in('id', judgeIds)
      : { data: [] };

    const results = [];
    for (const p of (participants || [])) {
      const judgeScores = [];
      for (const j of (judges || [])) {
        const { data: scores } = await supabase
          .from('scores')
          .select('score, sub_criteria_id')
          .eq('judge_id', j.id)
          .eq('participant_id', p.id);

        let total = 0;
        const hasScored = (scores || []).length > 0;

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
            total += (c.raw / c.max) * c.weight;
          }
        }

        judgeScores.push({ judge_name: j.name, total: Math.round(total * 100) / 100, has_scored: hasScored });
      }

      const scored = judgeScores.filter(j => j.has_scored);
      const avg = scored.length > 0
        ? Math.round((scored.reduce((s, j) => s + j.total, 0) / scored.length) * 100) / 100
        : 0;

      results.push({ ...p, judge_scores: judgeScores, average: avg });
    }

    results.sort((a, b) => b.average - a.average);
    results.forEach((r, i) => { r.rank = r.average > 0 ? i + 1 : '-'; });

    allResults[cat.code] = { ...cat, results };
  }

  res.json(allResults);
};
