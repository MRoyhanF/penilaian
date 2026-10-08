import { NextResponse } from 'next/server';
import { getAuthUser } from '../../../../lib/auth';
import { prisma } from '../../../../lib/prisma';

export async function GET(request) {
  try {
    const authUser = getAuthUser(request);
    if (!authUser) {
      return NextResponse.json({ user: null });
    }

    const user = await prisma.user.findUnique({
      where: { id: authUser.id },
      select: {
        id: true,
        name: true,
        username: true,
        role: true,
      },
    });

    return NextResponse.json({ user: user || null });
  } catch (error) {
    console.error('Me endpoint error:', error);
    return NextResponse.json({ user: null });
  }
}
