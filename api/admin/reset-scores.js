const { supabase } = require('../../lib/supabase');
const { requireAdmin } = require('../../lib/auth');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const user = requireAdmin(req, res);
  if (!user) return;

  const { scope, category_id, participant_id } = req.body;

  try {
    if (scope === 'all') {
      await supabase.from('scores').delete().neq('id', 0); // delete all
      return res.json({ success: true, message: 'Semua nilai penjurian berhasil direset' });
    } else if (scope === 'category' && category_id) {
      // Get participant IDs in this category
      const { data: participants } = await supabase
        .from('participants')
        .select('id')
        .eq('category_id', category_id);

      const pIds = (participants || []).map(p => p.id);
      if (pIds.length > 0) {
        await supabase.from('scores').delete().in('participant_id', pIds);
      }
      return res.json({ success: true, message: 'Nilai kategori berhasil direset' });
    } else if (scope === 'participant' && participant_id) {
      await supabase.from('scores').delete().eq('participant_id', participant_id);
      return res.json({ success: true, message: 'Nilai peserta berhasil direset' });
    } else {
      return res.status(400).json({ error: 'Scope reset tidak valid (gunakan: all, category, atau participant)' });
    }
  } catch (err) {
    return res.status(500).json({ error: 'Gagal mereset nilai: ' + err.message });
  }
};
