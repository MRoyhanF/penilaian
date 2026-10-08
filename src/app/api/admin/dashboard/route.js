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

    // Parallel optimized query fetching
    const [totalParticipants, totalJudges, categories, allScores] = await Promise.all([
      prisma.participant.count(),
      prisma.user.count({ where: { role: 'judge' } }),
      prisma.category.findMany({
        orderBy: { displayOrder: 'asc' },
        include: {
          participants: {
            select: { id: true },
          },
          judgeCategories: {
            select: { judgeId: true },
          },
        },
      }),
      prisma.score.findMany({
        select: {
          judgeId: true,
          participantId: true,
          participant: {
            select: { categoryId: true },
          },
        },
        distinct: ['judgeId', 'participantId'],
      }),
    ]);

    const totalScoresSubmitted = allScores.length;

    // Group scores by category in memory for instant speed (O(N) in memory)
    const categoryScoredMap = {};
    for (const score of allScores) {
      const catId = score.participant?.categoryId;
      if (catId) {
        categoryScoredMap[catId] = (categoryScoredMap[catId] || 0) + 1;
      }
    }

    let expectedScores = 0;
    const categoryStats = categories.map((cat) => {
      const participantCount = cat.participants.length;
      const judgeCount = cat.judgeCategories.length;
      const expectedCount = participantCount * judgeCount;
      expectedScores += expectedCount;

      const scoredCount = categoryScoredMap[cat.id] || 0;

      return {
        id: cat.id,
        code: cat.code,
        name: cat.name,
        participant_count: participantCount,
        scored_count: scoredCount,
        expected_count: expectedCount,
      };
    });

    const completionRate = expectedScores > 0 ? Math.round((totalScoresSubmitted / expectedScores) * 100) : 0;

    return NextResponse.json(
      {
        totalParticipants,
        totalJudges,
        totalCategories: categories.length,
        totalScoresSubmitted,
        expectedScores,
        completionRate,
        categoryStats,
      },
      {
        headers: {
          'Cache-Control': 'no-store, max-age=0',
        },
      }
    );
  } catch (error) {
    console.error('Admin dashboard error:', error);
    return NextResponse.json({ error: 'Terjadi kesalahan server' }, { status: 500 });
  }
}
