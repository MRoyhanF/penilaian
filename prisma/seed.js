/**
 * Prisma Seeder for Supabase PostgreSQL
 * 
 * Usage:
 *   npx prisma db seed
 *   or
 *   node prisma/seed.js
 */

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting Prisma database seed...\n');

  // Load JSON data
  const dataPath = path.join(__dirname, '..', 'data');
  const dataJson = JSON.parse(fs.readFileSync(path.join(dataPath, 'data.json'), 'utf-8'));
  const juriJson = JSON.parse(fs.readFileSync(path.join(dataPath, 'juri.json'), 'utf-8'));
  const rubrikJson = JSON.parse(fs.readFileSync(path.join(dataPath, 'rubrik.json'), 'utf-8'));

  // 1. Seed Admin
  console.log('👤 Seeding Admin user...');
  const adminPassword = await bcrypt.hash('admin123', 10);
  const admin = await prisma.user.upsert({
    where: { username: 'admin' },
    update: {
      name: 'Administrator',
      password: adminPassword,
      role: 'admin',
    },
    create: {
      name: 'Administrator',
      username: 'admin',
      password: adminPassword,
      role: 'admin',
    },
  });
  console.log(`   ✅ Admin ready (id: ${admin.id}, username: ${admin.username})`);

  // 2. Seed Judges
  console.log('\n👨‍⚖️ Seeding Judges...');
  const judgeMap = {};
  for (const judge of juriJson.judges) {
    const password = await bcrypt.hash(judge.username + '123', 10);
    const dbJudge = await prisma.user.upsert({
      where: { username: judge.username },
      update: {
        name: judge.name,
        password: password,
        role: 'judge',
      },
      create: {
        name: judge.name,
        username: judge.username,
        password: password,
        role: 'judge',
      },
    });
    judgeMap[judge.name] = dbJudge;
    console.log(`   ✅ Judge: ${judge.name} (username: ${judge.username}, password: ${judge.username}123)`);
  }

  // 3. Seed Categories
  console.log('\n📂 Seeding Categories...');
  const categoryNames = {
    'starter': 'Starter',
    'beginner': 'Beginner',
    'intermediate': 'Intermediate',
    'senior': 'Senior',
  };
  const categoryMap = {};
  let catOrder = 0;
  for (const [code, name] of Object.entries(categoryNames)) {
    const cat = await prisma.category.upsert({
      where: { code },
      update: {
        name,
        displayOrder: catOrder++,
      },
      create: {
        code,
        name,
        displayOrder: catOrder++,
      },
    });
    categoryMap[code] = cat;
    console.log(`   ✅ Category: ${name} (${code}, id: ${cat.id})`);
  }

  // 4. Assign Judges to Categories
  console.log('\n🔗 Assigning Judges to Categories...');
  for (const judge of juriJson.judges) {
    const dbJudge = judgeMap[judge.name];
    if (!dbJudge) continue;

    for (const catCode of judge.categories) {
      const cat = categoryMap[catCode];
      if (!cat) continue;

      await prisma.judgeCategory.upsert({
        where: {
          judgeId_categoryId: {
            judgeId: dbJudge.id,
            categoryId: cat.id,
          },
        },
        update: {},
        create: {
          judgeId: dbJudge.id,
          categoryId: cat.id,
        },
      });
    }
    console.log(`   ✅ Assigned ${judge.name} -> ${judge.categories.join(', ')}`);
  }

  // 5. Seed Participants
  console.log('\n🧑‍🎓 Seeding Participants...');
  let totalParticipants = 0;
  for (const [catCode, catData] of Object.entries(dataJson)) {
    const cat = categoryMap[catCode];
    if (!cat) continue;

    for (const p of catData.participants) {
      // Find or create participant
      const existing = await prisma.participant.findFirst({
        where: {
          categoryId: cat.id,
          number: p.number,
        },
      });

      if (existing) {
        await prisma.participant.update({
          where: { id: existing.id },
          data: {
            name: p.name,
            phone: p.phone || null,
            school: p.school || null,
            project: p.project || null,
          },
        });
      } else {
        await prisma.participant.create({
          data: {
            number: p.number,
            name: p.name,
            phone: p.phone || null,
            school: p.school || null,
            project: p.project || null,
            categoryId: cat.id,
          },
        });
      }
      totalParticipants++;
    }
  }
  console.log(`   ✅ ${totalParticipants} Participants seeded`);

  // 6. Seed Criteria & SubCriteria
  console.log('\n📋 Seeding Criteria & SubCriteria...');
  let critOrder = 0;
  for (const crit of rubrikJson.criteria) {
    // Find or create criteria by code
    let dbCrit = await prisma.criteria.findFirst({
      where: { code: crit.code },
    });

    if (dbCrit) {
      dbCrit = await prisma.criteria.update({
        where: { id: dbCrit.id },
        data: {
          name: crit.name,
          weight: crit.weight,
          maxScore: crit.max_score || 100,
          displayOrder: critOrder++,
        },
      });
    } else {
      dbCrit = await prisma.criteria.create({
        data: {
          code: crit.code,
          name: crit.name,
          weight: crit.weight,
          maxScore: crit.max_score || 100,
          displayOrder: critOrder++,
        },
      });
    }

    let subOrder = 0;
    for (const sub of crit.sub_criteria) {
      const existingSub = await prisma.subCriteria.findFirst({
        where: {
          criteriaId: dbCrit.id,
          code: sub.code,
        },
      });

      if (existingSub) {
        await prisma.subCriteria.update({
          where: { id: existingSub.id },
          data: {
            name: sub.name,
            detail: sub.detail || '',
            minScore: sub.score_range ? sub.score_range.min : 0,
            maxScore: sub.score_range ? sub.score_range.max : 25,
            displayOrder: subOrder++,
          },
        });
      } else {
        await prisma.subCriteria.create({
          data: {
            criteriaId: dbCrit.id,
            code: sub.code,
            name: sub.name,
            detail: sub.detail || '',
            minScore: sub.score_range ? sub.score_range.min : 0,
            maxScore: sub.score_range ? sub.score_range.max : 25,
            displayOrder: subOrder++,
          },
        });
      }
    }
    console.log(`   ✅ ${crit.name} (${crit.sub_criteria.length} sub-criteria)`);
  }

  console.log('\n🎉 Prisma database seed completed successfully!');
  console.log('\nDefault credentials:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  Admin  : username: admin          | password: admin123');
  for (const judge of juriJson.judges) {
    console.log(`  Juri   : username: ${judge.username.padEnd(14)} | password: ${judge.username}123`);
  }
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}

main()
  .catch((e) => {
    console.error('❌ Prisma Seed Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
