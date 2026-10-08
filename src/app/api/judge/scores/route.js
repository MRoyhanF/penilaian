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
    const participantId = parseInt(searchParams.get('participantId'));

    if (!participantId) {
      return NextResponse.json({ error: 'participantId is required' }, { status: 400 });
    }

    const scores = await prisma.score.findMany({
      where: {
        judgeId: user.id,
        participantId: participantId,
      },
      include: {
        subCriteria: {
          select: {
            code: true,
            criteriaId: true,
          },
        },
      },
    });

    const result = scores.map((s) => ({
      id: s.id,
      judge_id: s.judgeId,
      participant_id: s.participantId,
      sub_criteria_id: s.subCriteriaId,
      score: s.score,
      sub_criteria_code: s.subCriteria?.code,
      criteria_id: s.subCriteria?.criteriaId,
    }));

    return NextResponse.json(result);
  } catch (error) {
    console.error('Get scores error:', error);
    return NextResponse.json({ error: 'Terjadi kesalahan server' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const user = getAuthUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { participant_id, scores } = body;

    if (!participant_id || !scores || !Array.isArray(scores)) {
      return NextResponse.json({ error: 'Data tidak lengkap' }, { status: 400 });
    }

    // Save each score in a transaction
    await prisma.$transaction(
      scores.map((s) => {
        const scoreVal = parseInt(s.score) || 0;
        return prisma.score.upsert({
          where: {
            judgeId_participantId_subCriteriaId: {
              judgeId: user.id,
              participantId: parseInt(participant_id),
              subCriteriaId: parseInt(s.sub_criteria_id),
            },
          },
          update: {
            score: scoreVal,
            updatedAt: new Date(),
          },
          create: {
            judgeId: user.id,
            participantId: parseInt(participant_id),
            subCriteriaId: parseInt(s.sub_criteria_id),
            score: scoreVal,
          },
        });
      })
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Save scores error:', error);
    return NextResponse.json({ error: 'Gagal menyimpan nilai: ' + error.message }, { status: 500 });
  }
}
