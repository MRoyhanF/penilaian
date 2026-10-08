const { supabase } = require('../../lib/supabase');
const { requireAuth } = require('../../lib/auth');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const user = requireAuth(req, res);
  if (!user) return;

  if (req.method === 'GET') {
    const { participantId } = req.query;

    const { data: scores } = await supabase
      .from('scores')
      .select(`
        *,
        sub_criteria (code, criteria_id)
      `)
      .eq('judge_id', user.id)
      .eq('participant_id', participantId);

    const result = (scores || []).map(s => ({
      ...s,
      sub_criteria_code: s.sub_criteria?.code,
      criteria_id: s.sub_criteria?.criteria_id,
    }));

    return res.json(result);
  }

  if (req.method === 'POST') {
    const { participant_id, scores } = req.body;

    if (!participant_id || !scores || !Array.isArray(scores)) {
      return res.status(400).json({ error: 'Data tidak lengkap' });
    }

    try {
      for (const s of scores) {
        // Validate score range
        const { data: subCriteria } = await supabase
          .from('sub_criteria')
          .select('*')
          .eq('id', s.sub_criteria_id)
          .single();

        if (!subCriteria) continue;

        const score = Math.max(subCriteria.min_score, Math.min(subCriteria.max_score, parseInt(s.score) || 0));

        // Upsert: insert or update on conflict
        const { error } = await supabase
          .from('scores')
          .upsert({
            judge_id: user.id,
            participant_id: participant_id,
            sub_criteria_id: s.sub_criteria_id,
            score: score,
            updated_at: new Date().toISOString(),
          }, {
            onConflict: 'judge_id,participant_id,sub_criteria_id',
          });

        if (error) throw error;
      }

      return res.json({ success: true });
    } catch (err) {
      return res.status(500).json({ error: 'Gagal menyimpan nilai: ' + err.message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
};
