// src/app/api/telegram/generate-link/route.ts
// Admin gera um link de conexão Telegram para um líder (válido 30 min, uso único)

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { randomBytes } from "crypto";

const BOT_USERNAME = "ictaubate_bot";

export async function POST(req: NextRequest) {
  const session = await auth();
  const role = (session?.user as any)?.role as string | undefined;

  if (!session || !["ADMIN", "MASTER"].includes(role ?? "")) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  let userId: string;
  try {
    const body = await req.json();
    userId = body.userId;
    if (!userId) throw new Error("userId obrigatório");
  } catch {
    return NextResponse.json({ error: "userId obrigatório" }, { status: 400 });
  }

  // Verifica se o usuário existe
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { id: true, name: true } });
  if (!user) return NextResponse.json({ error: "Usuário não encontrado" }, { status: 404 });

  const token = randomBytes(16).toString("hex");
  const expiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30 minutos

  // Upsert: substitui token anterior (se existir) pelo novo
  await prisma.telegramLinkToken.upsert({
    where: { userId },
    update: { token, expiresAt },
    create: { userId, token, expiresAt },
  });

  const link = `https://t.me/${BOT_USERNAME}?start=${token}`;

  return NextResponse.json({ link, expiresAt });
}
