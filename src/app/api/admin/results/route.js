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

    const allCriteria = await prisma.criteria.findMany({
      orderBy: { displayOrder: 'asc' },
      select: {
        id: true,
        code: true,
        name: true,
        weight: true,
        maxScore: true,
      },
    });

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
                        code: true,
                        name: true,
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
          const criteriaBreakdown = {};

          for (const crit of allCriteria) {
            criteriaBreakdown[crit.code] = {
              id: crit.id,
              code: crit.code,
              name: crit.name,
              weight: crit.weight,
              maxScore: crit.maxScore,
              raw: 0,
              weighted: 0,
            };
          }

          if (hasScored) {
            for (const s of scores) {
              const crit = s.subCriteria.criteria;
              if (crit && criteriaBreakdown[crit.code]) {
                criteriaBreakdown[crit.code].raw += s.score;
              }
            }

            for (const critCode of Object.keys(criteriaBreakdown)) {
              const cb = criteriaBreakdown[critCode];
              cb.weighted = Math.round(((cb.raw / (cb.maxScore || 100)) * cb.weight) * 100) / 100;
              total += cb.weighted;
            }
          }

          return {
            judge_id: j.id,
            judge_name: j.name,
            total: Math.round(total * 100) / 100,
            has_scored: hasScored,
            criteria_scores: criteriaBreakdown,
          };
        });

        const scored = judgeScores.filter((j) => j.has_scored);
        const avg = scored.length > 0
          ? Math.round((scored.reduce((s, j) => s + j.total, 0) / scored.length) * 100) / 100
          : 0;

        // Calculate criteria totals across scored judges:
        // Jumlahkan seluruh poin sub-kriteria dari kedua juri (misal 4 + 4 = 8 sub-kriteria), lalu dibagi jumlah juri (dibagi 2)
        const criteriaTotals = {};
        for (const crit of allCriteria) {
          let sumRaw = 0;

          for (const js of scored) {
            if (js.criteria_scores && js.criteria_scores[crit.code]) {
              sumRaw += js.criteria_scores[crit.code].raw;
            }
          }

          // Jumlah semua poin sub-kriteria dari seluruh juri dibagi jumlah juri yang menilai
          const criteriaAvgScore = scored.length > 0
            ? Math.round((sumRaw / scored.length) * 100) / 100
            : 0;

          criteriaTotals[crit.code] = {
            id: crit.id,
            code: crit.code,
            name: crit.name,
            weight: crit.weight,
            maxScore: crit.maxScore,
            total: criteriaAvgScore, // Total nilai kriteria (jumlah 8 sub-kriteria / 2)
            sum_raw: sumRaw,        // Total akumulasi poin sub-kriteria (misal dari 8 sub-kriteria)
            average: criteriaAvgScore,
            judges_count: scored.length,
            has_scored: scored.length > 0,
          };
        }

        return {
          id: p.id,
          number: p.number,
          name: p.name,
          phone: p.phone,
          school: p.school,
          project: p.project,
          category_id: p.categoryId,
          judge_scores: judgeScores,
          criteria_totals: criteriaTotals,
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
        criteria: allCriteria,
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
