import { NextResponse } from 'next/server';
import { getAuthUser } from '../../../../../lib/auth';
import { prisma } from '../../../../../lib/prisma';

export async function GET(request) {
  try {
    const user = getAuthUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get judge category assignments
    const judgeCategories = await prisma.judgeCategory.findMany({
      where: { judgeId: user.id },
      include: {
        category: {
          include: {
            participants: {
              select: {
                id: true,
                scores: {
                  where: { judgeId: user.id },
                  select: { participantId: true },
                },
              },
            },
          },
        },
      },
      orderBy: {
        category: {
          displayOrder: 'asc',
        },
      },
    });

    const result = judgeCategories.map((jc) => {
      const cat = jc.category;
      const totalParticipants = cat.participants.length;
      const scoredCount = cat.participants.filter(
        (p) => p.scores && p.scores.length > 0
      ).length;

      return {
        id: cat.id,
        code: cat.code,
        name: cat.name,
        display_order: cat.displayOrder,
        total_participants: totalParticipants,
        scored_count: scoredCount,
      };
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('Judge categories error:', error);
    return NextResponse.json({ error: 'Terjadi kesalahan server' }, { status: 500 });
  }
}
