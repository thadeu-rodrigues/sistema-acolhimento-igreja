// src/app/api/users/[id]/route.ts
// PATCH: editar usuário | DELETE: desativar usuário

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";

const updateSchema = z.object({
  name:     z.string().min(2).optional(),
  email:    z.string().min(1).transform((v) => v.trim().toLowerCase()).optional(),
  phone:    z.string().optional().nullable(),
  role:     z.enum(["ADMIN", "MASTER", "LEADER"]).optional(),
  active:   z.boolean().optional(),
  password: z.string().min(6).optional(),
  // groupIds substitui TODOS os grupos do usuário
  groupIds: z.array(z.string()).optional(),
});

async function requireAdminOrMaster() {
  const session = await auth();
  if (!session?.user) return null;
  const role = (session.user as any).role;
  if (role !== "ADMIN" && role !== "MASTER") return null;
  return session;
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireAdminOrMaster();
  if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 403 });

  const { id } = await params;
  const body = await req.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { name, email, phone, role, active, password, groupIds } = parsed.data;

  // Verificar se e-mail já existe em outro usuário
  if (email) {
    const existing = await prisma.user.findFirst({
      where: { email, NOT: { id } },
    });
    if (existing) {
      return NextResponse.json({ error: "E-mail já cadastrado" }, { status: 409 });
    }
  }

  // Atualizar dados básicos
  const updateData: any = {};
  if (name)     updateData.name = name;
  if (email)    updateData.email = email;
  if (phone !== undefined) updateData.phone = phone || null;
  if (role)     updateData.role = role;
  if (active !== undefined) updateData.active = active;
  if (password) updateData.passwordHash = await bcrypt.hash(password, 12);

  const user = await prisma.user.update({
    where: { id },
    data: updateData,
  });

  // Substituir grupos se fornecido
  if (groupIds !== undefined) {
    await prisma.leaderGroup.deleteMany({ where: { userId: id } });
    if (groupIds.length > 0) {
      await prisma.leaderGroup.createMany({
        data: groupIds.map((groupId) => ({ userId: id, groupId })),
      });
    }
  }

  const updated = await prisma.user.findUnique({
    where: { id },
    include: { leaderGroups: { include: { group: true } } },
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

  // Não permite excluir o próprio usuário
  if (id === session.user?.id) {
    return NextResponse.json({ error: "Não é possível excluir o próprio usuário" }, { status: 400 });
  }

  // Desativa ao invés de deletar (preserva histórico)
  const user = await prisma.user.update({
    where: { id },
    data: { active: false },
  });

  return NextResponse.json(user);
}
