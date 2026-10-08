import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '../../../../lib/prisma';
import { generateToken } from '../../../../lib/auth';

export async function POST(request) {
  try {
    const body = await request.json();
    const { username, password } = body;

    if (!username || !password) {
      return NextResponse.json({ error: 'Username dan password wajib diisi' }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { username: username.trim() },
    });

    if (!user) {
      return NextResponse.json({ error: 'Username atau password salah' }, { status: 401 });
    }

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return NextResponse.json({ error: 'Username atau password salah' }, { status: 401 });
    }

    const token = generateToken(user);

    return NextResponse.json({
      user: {
        id: user.id,
        name: user.name,
        username: user.username,
        role: user.role,
      },
      token,
    });
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json({ error: 'Terjadi kesalahan server' }, { status: 500 });
  }
}
