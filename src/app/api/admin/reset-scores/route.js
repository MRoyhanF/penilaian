import { NextResponse } from 'next/server';
import { getAuthUser } from '../../../../../lib/auth';
import { prisma } from '../../../../../lib/prisma';

export async function POST(request) {
  try {
    const user = getAuthUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { scope, category_id, participant_id } = body;

    if (scope === 'all') {
      await prisma.score.deleteMany({});
      return NextResponse.json({ success: true, message: 'Semua nilai penjurian berhasil direset' });
    } else if (scope === 'category' && category_id) {
      const participants = await prisma.participant.findMany({
        where: { categoryId: parseInt(category_id) },
        select: { id: true },
      });
      const pIds = participants.map((p) => p.id);

      if (pIds.length > 0) {
        await prisma.score.deleteMany({
          where: { participantId: { in: pIds } },
        });
      }
      return NextResponse.json({ success: true, message: 'Nilai kategori berhasil direset' });
    } else if (scope === 'participant' && participant_id) {
      await prisma.score.deleteMany({
        where: { participantId: parseInt(participant_id) },
      });
      return NextResponse.json({ success: true, message: 'Nilai peserta berhasil direset' });
    } else {
      return NextResponse.json(
        { error: 'Scope reset tidak valid (gunakan: all, category, atau participant)' },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('Reset scores error:', error);
    return NextResponse.json({ error: 'Gagal mereset nilai: ' + error.message }, { status: 500 });
  }
}
