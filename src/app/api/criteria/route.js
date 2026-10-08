import { NextResponse } from 'next/server';
import { getAuthUser } from '../../../../lib/auth';
import { prisma } from '../../../../lib/prisma';

export async function GET(request) {
  try {
    const authUser = getAuthUser(request);
    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const criteria = await prisma.criteria.findMany({
      orderBy: { displayOrder: 'asc' },
      include: {
        subCriteria: {
          orderBy: { displayOrder: 'asc' },
        },
      },
    });

    // Format output to match client expectations
    const formatted = criteria.map((c) => ({
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

    return NextResponse.json(formatted);
  } catch (error) {
    console.error('Criteria error:', error);
    return NextResponse.json({ error: 'Terjadi kesalahan server' }, { status: 500 });
  }
}
