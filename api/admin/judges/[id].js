const bcrypt = require('bcryptjs');
const { supabase } = require('../../lib/supabase');
const { requireAdmin } = require('../../lib/auth');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const user = requireAdmin(req, res);
  if (!user) return;

  const { id } = req.query;

  // PUT - Update judge
  if (req.method === 'PUT') {
    const { name, username, password, category_ids } = req.body;

    const { data: judge } = await supabase
      .from('users')
      .select('*')
      .eq('id', id)
      .eq('role', 'judge')
      .single();

    if (!judge) {
      return res.status(404).json({ error: 'Data juri tidak ditemukan' });
    }

    if (!name || !username) {
      return res.status(400).json({ error: 'Nama dan username tidak boleh kosong' });
    }

    const cleanUsername = username.trim().toLowerCase();

    const { data: duplicate } = await supabase
      .from('users')
      .select('id')
      .eq('username', cleanUsername)
      .neq('id', id)
      .single();

    if (duplicate) {
      return res.status(400).json({ error: 'Username sudah digunakan oleh akun lain' });
    }

    try {
      const updateData = { name: name.trim(), username: cleanUsername };
      if (password && password.trim().length > 0) {
        updateData.password = bcrypt.hashSync(password.trim(), 10);
      }

      await supabase.from('users').update(updateData).eq('id', id);

      // Update category assignments
      await supabase.from('judge_categories').delete().eq('judge_id', id);

      if (Array.isArray(category_ids) && category_ids.length > 0) {
        const jcRows = category_ids.map(catId => ({
          judge_id: Number(id),
          category_id: Number(catId),
        }));
        await supabase.from('judge_categories').insert(jcRows);
      }

      return res.json({ success: true, message: 'Data juri berhasil diperbarui' });
    } catch (err) {
      return res.status(500).json({ error: 'Gagal memperbarui juri: ' + err.message });
    }
  }

  // DELETE - Delete judge
  if (req.method === 'DELETE') {
    const { data: judge } = await supabase
      .from('users')
      .select('*')
      .eq('id', id)
      .eq('role', 'judge')
      .single();

    if (!judge) {
      return res.status(404).json({ error: 'Data juri tidak ditemukan' });
    }

    try {
      await supabase.from('scores').delete().eq('judge_id', id);
      await supabase.from('judge_categories').delete().eq('judge_id', id);
      await supabase.from('users').delete().eq('id', id);

      return res.json({ success: true, message: `Akun juri ${judge.name} berhasil dihapus` });
    } catch (err) {
      return res.status(500).json({ error: 'Gagal menghapus juri: ' + err.message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
};
