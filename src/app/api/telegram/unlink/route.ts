// src/app/api/telegram/unlink/route.ts
// Desvincula o Telegram de um usuário

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const session = await auth();
  const role = (session?.user as any)?.role as string | undefined;
  const currentUserId = (session?.user as any)?.id as string | undefined;

  let userId: string;
  try {
    const body = await req.json();
    userId = body.userId;
    if (!userId) throw new Error("userId obrigatório");
  } catch {
    return NextResponse.json({ error: "userId obrigatório" }, { status: 400 });
  }

  // Apenas ADMIN, MASTER ou o próprio usuário podem desvincular
  const isAdminOrMaster = ["ADMIN", "MASTER"].includes(role ?? "");
  const isSelf = currentUserId === userId;

  if (!session || (!isAdminOrMaster && !isSelf)) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  // Desvincula no banco e limpa tokens pendentes
  await prisma.user.update({
    where: { id: userId },
    data: {
      telegramChatId: null,
      telegramLinkedAt: null,
    },
  });

  await prisma.telegramLinkToken.deleteMany({
    where: { userId },
  });

  return NextResponse.json({ success: true });
}
