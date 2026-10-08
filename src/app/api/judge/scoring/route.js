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

    const participant = await prisma.participant.findUnique({
      where: { id: participantId },
      include: {
        category: true,
      },
    });

    if (!participant) {
      return NextResponse.json({ error: 'Peserta tidak ditemukan' }, { status: 404 });
    }

    // Check assignment
    if (user.role !== 'admin') {
      const assigned = await prisma.judgeCategory.findFirst({
        where: {
          judgeId: user.id,
          categoryId: participant.categoryId,
        },
      });

      if (!assigned) {
        return NextResponse.json({ error: 'Anda tidak ditugaskan ke kategori ini' }, { status: 403 });
      }
    }

    // All criteria & subCriteria
    const criteriaList = await prisma.criteria.findMany({
      orderBy: { displayOrder: 'asc' },
      include: {
        subCriteria: {
          orderBy: { displayOrder: 'asc' },
        },
      },
    });

    const formattedCriteria = criteriaList.map((c) => ({
      id: c.id,
      code: c.code,
      name: c.name,
      weight: c.weight,
      max_score: c.maxScore,
      display_order: c.displayOrder,
      sub_criteria: c.subCriteria.map((s) => ({
        id: s.id,
        code: s.code,
        name: s.name,
        detail: s.detail,
        min_score: s.minScore,
        max_score: s.maxScore,
        display_order: s.displayOrder,
      })),
    }));

    // Current judge's scores for this participant
    const scores = await prisma.score.findMany({
      where: {
        judgeId: user.id,
        participantId: participant.id,
      },
      select: {
        subCriteriaId: true,
        score: true,
      },
    });

    const formattedScores = scores.map((s) => ({
      sub_criteria_id: s.subCriteriaId,
      score: s.score,
    }));

    // Previous and Next participant in the same category
    const prevParticipant = await prisma.participant.findFirst({
      where: {
        categoryId: participant.categoryId,
        number: { lt: participant.number },
      },
      orderBy: { number: 'desc' },
      select: { id: true },
    });

    const nextParticipant = await prisma.participant.findFirst({
      where: {
        categoryId: participant.categoryId,
        number: { gt: participant.number },
      },
      orderBy: { number: 'asc' },
      select: { id: true },
    });

    return NextResponse.json({
      participant: {
        id: participant.id,
        number: participant.number,
        name: participant.name,
        phone: participant.phone,
        school: participant.school,
        project: participant.project,
        category_id: participant.categoryId,
      },
      category: {
        id: participant.category.id,
        code: participant.category.code,
        name: participant.category.name,
        display_order: participant.category.displayOrder,
      },
      criteria: formattedCriteria,
      scores: formattedScores,
      prev_participant_id: prevParticipant ? prevParticipant.id : null,
      next_participant_id: nextParticipant ? nextParticipant.id : null,
    });
  } catch (error) {
    console.error('Scoring endpoint error:', error);
    return NextResponse.json({ error: 'Terjadi kesalahan server' }, { status: 500 });
  }
}
