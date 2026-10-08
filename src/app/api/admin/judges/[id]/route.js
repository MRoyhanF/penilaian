import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { getAuthUser } from '../../../../../../lib/auth';
import { prisma } from '../../../../../../lib/prisma';

export async function PUT(request, context) {
  try {
    const user = getAuthUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const params = await context.params;
    const judgeId = parseInt(params.id);

    if (!judgeId) {
      return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });
    }

    const judge = await prisma.user.findFirst({
      where: { id: judgeId, role: 'judge' },
    });

    if (!judge) {
      return NextResponse.json({ error: 'Data juri tidak ditemukan' }, { status: 404 });
    }

    const body = await request.json();
    const { name, username, password, category_ids } = body;

    if (!name || !username) {
      return NextResponse.json({ error: 'Nama dan username tidak boleh kosong' }, { status: 400 });
    }

    const cleanUsername = username.trim().toLowerCase();

    const duplicate = await prisma.user.findFirst({
      where: {
        username: cleanUsername,
        id: { not: judgeId },
      },
    });

    if (duplicate) {
      return NextResponse.json({ error: 'Username sudah digunakan oleh akun lain' }, { status: 400 });
    }

    const updateData = {
      name: name.trim(),
      username: cleanUsername,
    };

    if (password && password.trim().length > 0) {
      updateData.password = await bcrypt.hash(password.trim(), 10);
    }

    // Use transaction to update user & categories
    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: judgeId },
        data: updateData,
      });

      // Reset categories
      await tx.judgeCategory.deleteMany({
        where: { judgeId },
      });

      if (Array.isArray(category_ids) && category_ids.length > 0) {
        await tx.judgeCategory.createMany({
          data: category_ids.map((catId) => ({
            judgeId,
            categoryId: parseInt(catId),
          })),
        });
      }
    });

    return NextResponse.json({ success: true, message: 'Data juri berhasil diperbarui' });
  } catch (error) {
    console.error('Update judge error:', error);
    return NextResponse.json({ error: 'Gagal memperbarui juri: ' + error.message }, { status: 500 });
  }
}

export async function DELETE(request, context) {
  try {
    const user = getAuthUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const params = await context.params;
    const judgeId = parseInt(params.id);

    if (!judgeId) {
      return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });
    }

    const judge = await prisma.user.findFirst({
      where: { id: judgeId, role: 'judge' },
    });

    if (!judge) {
      return NextResponse.json({ error: 'Data juri tidak ditemukan' }, { status: 404 });
    }

    // Cascade delete scores and assignments handled by onDelete: Cascade in prisma, or delete directly
    await prisma.user.delete({
      where: { id: judgeId },
    });

    return NextResponse.json({
      success: true,
      message: `Akun juri ${judge.name} berhasil dihapus`,
    });
  } catch (error) {
    console.error('Delete judge error:', error);
    return NextResponse.json({ error: 'Gagal menghapus juri: ' + error.message }, { status: 500 });
  }
}
