const { supabase } = require('../../../lib/supabase');
const { requireAdmin } = require('../../../lib/auth');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const user = requireAdmin(req, res);
  if (!user) return;

  const { categoryId } = req.query;

  const { data: participants } = await supabase
    .from('participants')
    .select('*')
    .eq('category_id', categoryId)
    .order('number');

  const { data: judgeCats } = await supabase
    .from('judge_categories')
    .select('judge_id')
    .eq('category_id', categoryId);

  const judgeIds = (judgeCats || []).map(jc => jc.judge_id);

  const { data: judges } = judgeIds.length > 0
    ? await supabase
        .from('users')
        .select('id, name')
        .eq('role', 'judge')
        .in('id', judgeIds)
    : { data: [] };

  const { data: criteria } = await supabase
    .from('criteria')
    .select('*')
    .order('display_order');

  const { data: subCriteria } = await supabase
    .from('sub_criteria')
    .select('*')
    .order('criteria_id, display_order');

  const results = [];
  for (const p of (participants || [])) {
    const judgeScores = [];
    for (const j of (judges || [])) {
      const { data: scores } = await supabase
        .from('scores')
        .select(`
          score, sub_criteria_id,
          sub_criteria (code, name, criteria_id)
        `)
        .eq('judge_id', j.id)
        .eq('participant_id', p.id);

      let totalWeighted = 0;
      const criteriaScores = {};
      const hasScored = (scores || []).length > 0;

      for (const s of (scores || [])) {
        const sc = s.sub_criteria;
        if (!sc) continue;
        const crit = (criteria || []).find(c => c.id === sc.criteria_id);
        if (!crit) continue;

        const critCode = crit.code;
        if (!criteriaScores[critCode]) {
          criteriaScores[critCode] = {
            name: crit.name,
            weight: crit.weight,
            raw_total: 0,
            max: 100,
            subs: [],
          };
        }
        criteriaScores[critCode].raw_total += s.score;
        criteriaScores[critCode].subs.push({
          code: sc.code,
          name: sc.name,
          score: s.score,
        });
      }

      for (const cs of Object.values(criteriaScores)) {
        totalWeighted += (cs.raw_total / cs.max) * cs.weight;
      }

      judgeScores.push({
        judge_id: j.id,
        judge_name: j.name,
        scores: (scores || []).map(s => ({
          score: s.score,
          sub_code: s.sub_criteria?.code,
          sub_name: s.sub_criteria?.name,
          criteria_id: s.sub_criteria?.criteria_id,
        })),
        criteria_scores: criteriaScores,
        total_weighted: Math.round(totalWeighted * 100) / 100,
        has_scored: hasScored,
      });
    }

    const scoredJudges = judgeScores.filter(js => js.has_scored);
    const averageScore = scoredJudges.length > 0
      ? Math.round((scoredJudges.reduce((sum, js) => sum + js.total_weighted, 0) / scoredJudges.length) * 100) / 100
      : 0;

    results.push({
      ...p,
      judge_scores: judgeScores,
      average_score: averageScore,
      is_complete: scoredJudges.length === (judges || []).length,
    });
  }

  results.sort((a, b) => b.average_score - a.average_score);
  results.forEach((r, i) => { r.rank = r.average_score > 0 ? i + 1 : '-'; });

  res.json({ participants: results, judges: judges || [], criteria: criteria || [], subCriteria: subCriteria || [] });
};
