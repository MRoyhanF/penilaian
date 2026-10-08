import { NextResponse } from 'next/server';
import { getAuthUser } from '../../../../../lib/auth';
import { prisma } from '../../../../../lib/prisma';

export async function GET(request) {
  try {
    const user = getAuthUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const categoryCode = searchParams.get('category');

    const categories = await prisma.category.findMany({
      where: categoryCode ? { code: categoryCode } : undefined,
      orderBy: { displayOrder: 'asc' },
      include: {
        participants: {
          orderBy: { number: 'asc' },
          include: {
            scores: {
              select: {
                judgeId: true,
                score: true,
                subCriteria: {
                  select: {
                    criteria: {
                      select: {
                        id: true,
                        weight: true,
                        maxScore: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
        judgeCategories: {
          include: {
            judge: {
              select: {
                id: true,
                name: true,
                username: true,
              },
            },
          },
        },
      },
    });

    const allResults = {};

    for (const cat of categories) {
      const judges = cat.judgeCategories.map((jc) => ({
        id: jc.judge.id,
        name: jc.judge.name,
        username: jc.judge.username,
      }));

      const results = cat.participants.map((p) => {
        const judgeScores = judges.map((j) => {
          const scores = p.scores.filter((s) => s.judgeId === j.id);
          const hasScored = scores.length > 0;
          let total = 0;

          if (hasScored) {
            const criteriaMap = {};
            for (const s of scores) {
              const crit = s.subCriteria.criteria;
              if (!criteriaMap[crit.id]) {
                criteriaMap[crit.id] = { raw: 0, weight: crit.weight, max: crit.maxScore };
              }
              criteriaMap[crit.id].raw += s.score;
            }

            for (const c of Object.values(criteriaMap)) {
              total += (c.raw / c.max) * c.weight;
            }
          }

          return {
            judge_id: j.id,
            judge_name: j.name,
            total: Math.round(total * 100) / 100,
            has_scored: hasScored,
          };
        });

        const scored = judgeScores.filter((j) => j.has_scored);
        const avg = scored.length > 0
          ? Math.round((scored.reduce((s, j) => s + j.total, 0) / scored.length) * 100) / 100
          : 0;

        return {
          id: p.id,
          number: p.number,
          name: p.name,
          phone: p.phone,
          school: p.school,
          project: p.project,
          category_id: p.categoryId,
          judge_scores: judgeScores,
          average: avg,
        };
      });

      // Sort by average descending
      results.sort((a, b) => b.average - a.average);
      results.forEach((r, i) => {
        r.rank = r.average > 0 ? i + 1 : '-';
      });

      allResults[cat.code] = {
        id: cat.id,
        code: cat.code,
        name: cat.name,
        display_order: cat.displayOrder,
        judges,
        results,
      };
    }

    if (categoryCode && allResults[categoryCode]) {
      return NextResponse.json(allResults[categoryCode]);
    }

    return NextResponse.json(allResults);
  } catch (error) {
    console.error('Admin results error:', error);
    return NextResponse.json({ error: 'Terjadi kesalahan server' }, { status: 500 });
  }
}
