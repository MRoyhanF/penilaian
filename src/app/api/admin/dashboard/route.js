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

    // Counts
    const totalParticipants = await prisma.participant.count();
    const totalJudges = await prisma.user.count({ where: { role: 'judge' } });
    const totalCategories = await prisma.category.count();

    // Unique judge-participant scores
    const distinctScores = await prisma.score.groupBy({
      by: ['judgeId', 'participantId'],
    });
    const totalScoresSubmitted = distinctScores.length;

    // Categories with participants & judge assignments
    const categories = await prisma.category.findMany({
      orderBy: { displayOrder: 'asc' },
      include: {
        participants: {
          select: {
            id: true,
          },
        },
        judgeCategories: {
          select: {
            judgeId: true,
          },
        },
      },
    });

    let expectedScores = 0;
    const categoryStats = [];

    for (const cat of categories) {
      const participantCount = cat.participants.length;
      const judgeCount = cat.judgeCategories.length;
      const expectedCount = participantCount * judgeCount;
      expectedScores += expectedCount;

      const catParticipantIds = cat.participants.map((p) => p.id);
      let catScoredCount = 0;

      if (catParticipantIds.length > 0) {
        const catDistinctScores = await prisma.score.groupBy({
          by: ['judgeId', 'participantId'],
          where: {
            participantId: { in: catParticipantIds },
          },
        });
        catScoredCount = catDistinctScores.length;
      }

      categoryStats.push({
        id: cat.id,
        code: cat.code,
        name: cat.name,
        participant_count: participantCount,
        scored_count: catScoredCount,
        expected_count: expectedCount,
      });
    }

    const completionRate = expectedScores > 0 ? Math.round((totalScoresSubmitted / expectedScores) * 100) : 0;

    return NextResponse.json({
      totalParticipants,
      totalJudges,
      totalCategories,
      totalScoresSubmitted,
      expectedScores,
      completionRate,
      categoryStats,
    });
  } catch (error) {
    console.error('Admin dashboard error:', error);
    return NextResponse.json({ error: 'Terjadi kesalahan server' }, { status: 500 });
  }
}
