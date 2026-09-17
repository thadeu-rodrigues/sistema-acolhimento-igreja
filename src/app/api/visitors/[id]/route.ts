// src/app/api/visitors/[id]/route.ts
// PATCH: Atualizar status, líder atribuído de um visitante

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { z } from "zod";

const visitorUpdateSchema = z.object({
  status: z.enum(["NOVO", "EM_CONTATO", "INTEGRADO", "SEM_RESPOSTA", "ARQUIVADO"]).optional(),
  assignedLeaderId: z.string().nullable().optional(),
});

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  const { id } = await params;
  const userRole = (session.user as any).role as string;
  const userId = session.user.id as string;

  const body = await req.json();
  const parsed = visitorUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { status, assignedLeaderId } = parsed.data;

  // Se for LEADER, verificar se o visitante pertence a um dos seus grupos
  if (userRole === "LEADER") {
    const leaderGroups = await prisma.leaderGroup.findMany({
      where: { userId },
      select: { groupId: true },
    });
    const groupIds = leaderGroups.map((lg) => lg.groupId);

    const visitor = await prisma.visitor.findUnique({
      where: { id },
      select: { groupId: true },
    });

    if (!visitor || !groupIds.includes(visitor.groupId)) {
      return NextResponse.json(
        { error: "Acesso negado a este visitante" },
        { status: 403 }
      );
    }
  }

  const updateData: any = {};
  if (status) updateData.status = status;
  if (assignedLeaderId !== undefined) updateData.assignedLeaderId = assignedLeaderId;

  const updatedVisitor = await prisma.visitor.update({
    where: { id },
    data: updateData,
    include: { group: true, assignedLeader: true },
  });

  return NextResponse.json(updatedVisitor);
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  const { id } = await params;
  const userRole = (session.user as any).role as string;
  const userId = session.user.id as string;

  if (userRole === "LEADER") {
    const leaderGroups = await prisma.leaderGroup.findMany({
      where: { userId },
      select: { groupId: true },
    });
    const groupIds = leaderGroups.map((lg) => lg.groupId);

    const visitor = await prisma.visitor.findUnique({
      where: { id },
      select: { groupId: true },
    });

    if (!visitor || !groupIds.includes(visitor.groupId)) {
      return NextResponse.json(
        { error: "Acesso negado a este visitante" },
        { status: 403 }
      );
    }
  }

  await prisma.visitor.delete({
    where: { id },
  });

  return NextResponse.json({ success: true });
}
