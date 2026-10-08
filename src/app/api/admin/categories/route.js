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

    const categories = await prisma.category.findMany({
      orderBy: { displayOrder: 'asc' },
    });

    const result = categories.map((c) => ({
      id: c.id,
      code: c.code,
      name: c.name,
      display_order: c.displayOrder,
    }));

    return NextResponse.json(result);
  } catch (error) {
    console.error('Admin categories error:', error);
    return NextResponse.json({ error: 'Terjadi kesalahan server' }, { status: 500 });
  }
}
