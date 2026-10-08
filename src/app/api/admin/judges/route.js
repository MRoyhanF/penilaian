import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
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

    const judges = await prisma.user.findMany({
      where: { role: 'judge' },
      orderBy: { id: 'asc' },
      include: {
        judgeCategories: {
          include: {
            category: {
              include: {
                participants: {
                  select: { id: true },
                },
              },
            },
          },
        },
        scores: {
          select: { participantId: true },
          distinct: ['participantId'],
        },
      },
    });

    const judgesWithDetails = judges.map((j) => {
      const cats = j.judgeCategories.map((jc) => ({
        id: jc.category.id,
        code: jc.category.code,
        name: jc.category.name,
      }));

      // Count distinct participants in all assigned categories
      const participantIdSet = new Set();
      j.judgeCategories.forEach((jc) => {
        jc.category.participants.forEach((p) => participantIdSet.add(p.id));
      });

      return {
        id: j.id,
        name: j.name,
        username: j.username,
        created_at: j.createdAt,
        categories: cats,
        category_ids: cats.map((c) => c.id),
        categories_label: cats.map((c) => c.name).join(', '),
        scored_count: j.scores.length,
        total_participants: participantIdSet.size,
      };
    });

    return NextResponse.json(judgesWithDetails);
  } catch (error) {
    console.error('Admin get judges error:', error);
    return NextResponse.json({ error: 'Terjadi kesalahan server' }, { status: 500 });
  }
}

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
    const { name, username, password, category_ids } = body;

    if (!name || !username || !password) {
      return NextResponse.json({ error: 'Nama, username, dan password wajib diisi' }, { status: 400 });
    }

    const cleanUsername = username.trim().toLowerCase();

    const existing = await prisma.user.findUnique({
      where: { username: cleanUsername },
    });

    if (existing) {
      return NextResponse.json({ error: 'Username sudah digunakan oleh akun lain' }, { status: 400 });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await prisma.user.create({
      data: {
        name: name.trim(),
        username: cleanUsername,
        password: hashedPassword,
        role: 'judge',
        judgeCategories: Array.isArray(category_ids) && category_ids.length > 0 ? {
          create: category_ids.map((catId) => ({
            categoryId: parseInt(catId),
          })),
        } : undefined,
      },
    });

    return NextResponse.json({
      success: true,
      id: newUser.id,
      message: 'Juri baru berhasil ditambahkan',
    });
  } catch (error) {
    console.error('Admin create judge error:', error);
    return NextResponse.json({ error: 'Gagal menambahkan juri: ' + error.message }, { status: 500 });
  }
}
