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

  // Total participants
  const { count: totalParticipants } = await supabase
    .from('participants')
    .select('*', { count: 'exact', head: true });

  // Total judges
  const { count: totalJudges } = await supabase
    .from('users')
    .select('*', { count: 'exact', head: true })
    .eq('role', 'judge');

  // Total categories
  const { count: totalCategories } = await supabase
    .from('categories')
    .select('*', { count: 'exact', head: true });

  // Get all scores to count unique judge-participant pairs
  const { data: allScores } = await supabase
    .from('scores')
    .select('judge_id, participant_id');

  const uniqueScored = new Set((allScores || []).map(s => `${s.judge_id}-${s.participant_id}`));
  const totalScoresSubmitted = uniqueScored.size;

  // Expected scores: count all judge-category-participant combinations
  const { data: judgeCategories } = await supabase
    .from('judge_categories')
    .select('judge_id, category_id');

  let expectedScores = 0;
  const categoryParticipantCounts = {};

  for (const jc of (judgeCategories || [])) {
    if (!categoryParticipantCounts[jc.category_id]) {
      const { count } = await supabase
        .from('participants')
        .select('*', { count: 'exact', head: true })
        .eq('category_id', jc.category_id);
      categoryParticipantCounts[jc.category_id] = count || 0;
    }
    expectedScores += categoryParticipantCounts[jc.category_id];
  }

  // Per category stats
  const { data: categories } = await supabase
    .from('categories')
    .select('*')
    .order('display_order');

  const categoryStats = [];
  for (const cat of (categories || [])) {
    const { count: participantCount } = await supabase
      .from('participants')
      .select('*', { count: 'exact', head: true })
      .eq('category_id', cat.id);

    // Scored count for this category
    const { data: catScores } = await supabase
      .from('scores')
      .select('judge_id, participant_id, participants!inner(category_id)')
      .eq('participants.category_id', cat.id);

    const catUniqueScored = new Set((catScores || []).map(s => `${s.judge_id}-${s.participant_id}`));

    // Expected for this category
    const catJudges = (judgeCategories || []).filter(jc => jc.category_id === cat.id);
    const expectedCount = catJudges.length * (participantCount || 0);

    categoryStats.push({
      id: cat.id,
      code: cat.code,
      name: cat.name,
      participant_count: participantCount || 0,
      scored_count: catUniqueScored.size,
      expected_count: expectedCount,
    });
  }

  res.json({
    totalParticipants: totalParticipants || 0,
    totalJudges: totalJudges || 0,
    totalCategories: totalCategories || 0,
    totalScoresSubmitted,
    expectedScores,
    completionRate: expectedScores > 0 ? Math.round((totalScoresSubmitted / expectedScores) * 100) : 0,
    categoryStats,
  });
};
