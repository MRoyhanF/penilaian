import { NextResponse } from 'next/server';
import { getAuthUser } from '../../../../../lib/auth';
import { prisma } from '../../../../../lib/prisma';

export async function GET(request) {
  try {
    const user = getAuthUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const categoryId = parseInt(searchParams.get('categoryId'));

    if (!categoryId) {
      return NextResponse.json({ error: 'categoryId parameter is required' }, { status: 400 });
    }

    // Check if judge is assigned to this category
    if (user.role !== 'admin') {
      const assigned = await prisma.judgeCategory.findFirst({
        where: {
          judgeId: user.id,
          categoryId: categoryId,
        },
      });

      if (!assigned) {
        return NextResponse.json({ error: 'Anda tidak ditugaskan ke kategori ini' }, { status: 403 });
      }
    }

    const category = await prisma.category.findUnique({
      where: { id: categoryId },
    });

    const participants = await prisma.participant.findMany({
      where: { categoryId },
      orderBy: { number: 'asc' },
      include: {
        scores: {
          where: { judgeId: user.id },
          include: {
            subCriteria: {
              include: {
                criteria: true,
              },
            },
          },
        },
      },
    });

    const participantsWithStatus = participants.map((p) => {
      const scores = p.scores || [];
      const hasScored = scores.length > 0;
      let totalScore = 0;

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
          totalScore += (c.raw / c.max) * c.weight;
        }
        totalScore = Math.round(totalScore * 100) / 100;
      }

      return {
        id: p.id,
        number: p.number,
        name: p.name,
        phone: p.phone,
        school: p.school,
        project: p.project,
        category_id: p.categoryId,
        has_scored: hasScored,
        score_total: totalScore,
      };
    });

    return NextResponse.json({
      category: category ? {
        id: category.id,
        code: category.code,
        name: category.name,
        display_order: category.displayOrder,
      } : null,
      participants: participantsWithStatus,
    });
  } catch (error) {
    console.error('Judge participants error:', error);
    return NextResponse.json({ error: 'Terjadi kesalahan server' }, { status: 500 });
  }
}
