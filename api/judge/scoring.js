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

  const { participantId } = req.query;

  const { data: participant } = await supabase
    .from('participants')
    .select('*')
    .eq('id', participantId)
    .single();

  if (!participant) {
    return res.status(404).json({ error: 'Peserta tidak ditemukan' });
  }

  // Check assignment
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

  // Criteria & Sub-criteria
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

  // Current judge scores
  const { data: scores } = await supabase
    .from('scores')
    .select('sub_criteria_id, score')
    .eq('judge_id', user.id)
    .eq('participant_id', participantId);

  // Find previous and next participants in the same category
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
};
