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
};
