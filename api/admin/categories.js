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

  res.json(categories || []);
};
