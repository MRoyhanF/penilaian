/**
 * Seed script for Supabase
 * 
 * Usage:
 *   1. Set environment variables in .env file
 *   2. Run: node supabase/seed.js
 * 
 * This will populate the Supabase database with initial data
 * (admin, judges, categories, participants, criteria, sub-criteria)
 */

require('dotenv').config();
const bcrypt = require('bcryptjs');
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function seed() {
  console.log('🌱 Starting database seed...\n');

  // Check if already seeded
  const { count } = await supabase.from('users').select('*', { count: 'exact', head: true });
  if (count > 0) {
    console.log('⚠️  Database already has data. Skipping seed.');
    console.log('   To re-seed, clear all tables first.');
    return;
  }

  // Load JSON data
  const dataJson = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data', 'data.json'), 'utf-8'));
  const juriJson = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data', 'juri.json'), 'utf-8'));
  const rubrikJson = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data', 'rubrik.json'), 'utf-8'));

  // 1. Seed admin
  console.log('👤 Creating admin user...');
  const adminPassword = bcrypt.hashSync('admin123', 10);
  const { data: admin } = await supabase
    .from('users')
    .insert({ name: 'Administrator', username: 'admin', password: adminPassword, role: 'admin' })
    .select('id')
    .single();
  console.log(`   ✅ Admin created (id: ${admin.id})`);

  // 2. Seed judges
  console.log('👨‍⚖️ Creating judges...');
  const judgeIds = {};
  for (const judge of juriJson.judges) {
    const password = bcrypt.hashSync(judge.username + '123', 10);
    const { data: newJudge } = await supabase
      .from('users')
      .insert({ name: judge.name, username: judge.username, password: password, role: 'judge' })
      .select('id')
      .single();
    judgeIds[judge.name] = newJudge.id;
    console.log(`   ✅ ${judge.name} (username: ${judge.username}, password: ${judge.username}123)`);
  }

  // 3. Seed categories
  console.log('📂 Creating categories...');
  const categoryMap = {
    'starter': 'Starter',
    'beginner': 'Beginner',
    'intermediate': 'Intermediate',
    'senior': 'Senior',
  };
  const categoryIds = {};
  let order = 0;
  for (const [code, name] of Object.entries(categoryMap)) {
    const { data: cat } = await supabase
      .from('categories')
      .insert({ code, name, display_order: order++ })
      .select('id')
      .single();
    categoryIds[code] = cat.id;
    console.log(`   ✅ ${name} (id: ${cat.id})`);
  }

  // 4. Seed judge-category relationships
  console.log('🔗 Assigning judges to categories...');
  for (const judge of juriJson.judges) {
    for (const cat of judge.categories) {
      await supabase.from('judge_categories').insert({
        judge_id: judgeIds[judge.name],
        category_id: categoryIds[cat],
      });
    }
    console.log(`   ✅ ${judge.name} → ${judge.categories.join(', ')}`);
  }

  // 5. Seed participants
  console.log('🧑‍🎓 Creating participants...');
  let totalParticipants = 0;
  for (const [categoryCode, categoryData] of Object.entries(dataJson)) {
    const catId = categoryIds[categoryCode];
    for (const participant of categoryData.participants) {
      await supabase.from('participants').insert({
        number: participant.number,
        name: participant.name,
        phone: participant.phone,
        school: participant.school,
        project: participant.project,
        category_id: catId,
      });
      totalParticipants++;
    }
  }
  console.log(`   ✅ ${totalParticipants} participants created`);

  // 6. Seed criteria & sub-criteria
  console.log('📋 Creating criteria & sub-criteria...');
  let criteriaOrder = 0;
  for (const criteria of rubrikJson.criteria) {
    const { data: crit } = await supabase
      .from('criteria')
      .insert({
        code: criteria.code,
        name: criteria.name,
        weight: criteria.weight,
        max_score: criteria.max_score,
        display_order: criteriaOrder++,
      })
      .select('id')
      .single();

    let subOrder = 0;
    for (const sub of criteria.sub_criteria) {
      await supabase.from('sub_criteria').insert({
        criteria_id: crit.id,
        code: sub.code,
        name: sub.name,
        detail: sub.detail,
        min_score: sub.score_range.min,
        max_score: sub.score_range.max,
        display_order: subOrder++,
      });
    }
    console.log(`   ✅ ${criteria.name} (${criteria.sub_criteria.length} sub-criteria)`);
  }

  console.log('\n🎉 Database seeded successfully!\n');
  console.log('Default accounts:');
  console.log('  Admin   → username: admin, password: admin123');
  for (const judge of juriJson.judges) {
    console.log(`  ${judge.name.padEnd(12)} → username: ${judge.username}, password: ${judge.username}123`);
  }
}

seed().catch(err => {
  console.error('❌ Seed failed:', err.message);
  process.exit(1);
});
