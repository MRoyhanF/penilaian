const bcrypt = require('bcryptjs');
const { supabase } = require('../../lib/supabase');
const { requireAdmin } = require('../../lib/auth');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const user = requireAdmin(req, res);
  if (!user) return;

  // GET - List all judges
  if (req.method === 'GET') {
    const { data: judges } = await supabase
      .from('users')
      .select('id, name, username, created_at')
      .eq('role', 'judge')
      .order('id');

    const judgesWithDetails = [];
    for (const j of (judges || [])) {
      const { data: assignedCats } = await supabase
        .from('judge_categories')
        .select('category_id, categories(id, code, name)')
        .eq('judge_id', j.id);

      const cats = (assignedCats || []).map(ac => ({
        id: ac.categories.id,
        code: ac.categories.code,
        name: ac.categories.name,
      }));

      const { data: scoredData } = await supabase
        .from('scores')
        .select('participant_id')
        .eq('judge_id', j.id);

      const scoredParticipantIds = new Set((scoredData || []).map(s => s.participant_id));

      // Total participants in assigned categories
      const catIds = cats.map(c => c.id);
      let totalParticipants = 0;
      if (catIds.length > 0) {
        const { count } = await supabase
          .from('participants')
          .select('*', { count: 'exact', head: true })
          .in('category_id', catIds);
        totalParticipants = count || 0;
      }

      judgesWithDetails.push({
        ...j,
        categories: cats,
        category_ids: cats.map(c => c.id),
        categories_label: cats.map(c => c.name).join(', '),
        scored_count: scoredParticipantIds.size,
        total_participants: totalParticipants,
      });
    }

    return res.json(judgesWithDetails);
  }

  // POST - Create new judge
  if (req.method === 'POST') {
    const { name, username, password, category_ids } = req.body;

    if (!name || !username || !password) {
      return res.status(400).json({ error: 'Nama, username, dan password wajib diisi' });
    }

    const cleanUsername = username.trim().toLowerCase();

    const { data: existing } = await supabase
      .from('users')
      .select('id')
      .eq('username', cleanUsername)
      .single();

    if (existing) {
      return res.status(400).json({ error: 'Username sudah digunakan oleh akun lain' });
    }

    const hashedPassword = bcrypt.hashSync(password, 10);

    const { data: newUser, error: insertError } = await supabase
      .from('users')
      .insert({
        name: name.trim(),
        username: cleanUsername,
        password: hashedPassword,
        role: 'judge',
      })
      .select('id')
      .single();

    if (insertError) {
      return res.status(500).json({ error: 'Gagal menambahkan juri: ' + insertError.message });
    }

    if (Array.isArray(category_ids) && category_ids.length > 0) {
      const jcRows = category_ids.map(catId => ({
        judge_id: newUser.id,
        category_id: Number(catId),
      }));
      await supabase.from('judge_categories').insert(jcRows);
    }

    return res.json({ success: true, id: newUser.id, message: 'Juri baru berhasil ditambahkan' });
  }

  return res.status(405).json({ error: 'Method not allowed' });
};
