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

  // Get categories assigned to this judge
  const { data: judgeCats, error: jcError } = await supabase
    .from('judge_categories')
    .select('category_id')
    .eq('judge_id', user.id);

  if (jcError) return res.status(500).json({ error: jcError.message });

  const categoryIds = judgeCats.map(jc => jc.category_id);

  if (categoryIds.length === 0) {
    return res.json([]);
  }

  const { data: categories, error: catError } = await supabase
    .from('categories')
    .select('*')
    .in('id', categoryIds)
    .order('display_order');

  if (catError) return res.status(500).json({ error: catError.message });

  // Get participant counts and scored counts for each category
  const result = [];
  for (const cat of categories) {
    const { count: totalParticipants } = await supabase
      .from('participants')
      .select('*', { count: 'exact', head: true })
      .eq('category_id', cat.id);

    // Get distinct participant IDs that this judge has scored in this category
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
};
