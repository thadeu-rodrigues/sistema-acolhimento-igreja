// src/app/api/groups/[id]/route.ts
// GET: obter grupo | PATCH: editar dados da rede e administradores/líderes | DELETE: desativar grupo

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { z } from "zod";

const updateGroupSchema = z.object({
  name: z.string().min(2).optional(),
  description: z.string().optional().nullable(),
  whatsappTemplate: z.string().optional().nullable(),
  active: z.boolean().optional(),
  leaderUserIds: z.array(z.string()).optional(),
});

async function requireAdminOrMaster() {
  const session = await auth();
  if (!session?.user) return null;
  const role = (session.user as any).role;
  if (role !== "ADMIN" && role !== "MASTER") return null;
  return session;
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const { id } = await params;
  const group = await prisma.group.findUnique({
    where: { id },
    include: {
      leaders: {
        include: {
          user: {
            select: { id: true, name: true, email: true, phone: true, role: true, active: true },
          },
        },
      },
    },
  });

  if (!group) {
    return NextResponse.json({ error: "Grupo não encontrado" }, { status: 404 });
  }

  return NextResponse.json(group);
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireAdminOrMaster();
  if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 403 });

  const { id } = await params;
  const body = await req.json();
  const parsed = updateGroupSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { name, description, whatsappTemplate, active, leaderUserIds } = parsed.data;

  // Verificar se o grupo existe
  const currentGroup = await prisma.group.findUnique({ where: { id } });
  if (!currentGroup) {
    return NextResponse.json({ error: "Grupo não encontrado" }, { status: 404 });
  }

  // Se o nome foi alterado, verificar duplicidade
  if (name && name !== currentGroup.name) {
    const existing = await prisma.group.findUnique({ where: { name } });
    if (existing) {
      return NextResponse.json({ error: `Já existe uma rede ministerial com o nome "${name}"` }, { status: 409 });
    }
  }

  const updateData: any = {};
  if (name !== undefined) updateData.name = name;
  if (description !== undefined) updateData.description = description || null;
  if (whatsappTemplate !== undefined) updateData.whatsappTemplate = whatsappTemplate || null;
  if (active !== undefined) updateData.active = active;

  await prisma.group.update({
    where: { id },
    data: updateData,
  });

  // Atualizar alocação de líderes se informada
  if (leaderUserIds !== undefined) {
    await prisma.leaderGroup.deleteMany({ where: { groupId: id } });
    if (leaderUserIds.length > 0) {
      await prisma.leaderGroup.createMany({
        data: leaderUserIds.map((userId) => ({ userId, groupId: id })),
      });
    }
  }

  const updated = await prisma.group.findUnique({
    where: { id },
    include: {
      leaders: {
        include: {
          user: {
            select: { id: true, name: true, email: true, phone: true, role: true, active: true },
          },
        },
      },
    },
  });

  return NextResponse.json(updated);
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireAdminOrMaster();
  if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 403 });

  const { id } = await params;
  
  // Desativa o grupo sem excluir visitantes associados
  const group = await prisma.group.update({
    where: { id },
    data: { active: false },
  });

  return NextResponse.json({ message: "Grupo desativado com sucesso", group });
}
