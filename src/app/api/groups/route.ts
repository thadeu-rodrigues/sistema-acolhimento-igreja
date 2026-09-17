// src/app/api/groups/route.ts
// GET: listar grupos e seus líderes | POST: criar nova rede/grupo

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { z } from "zod";

const createGroupSchema = z.object({
  name: z.string().min(2),
  description: z.string().optional().nullable(),
  whatsappTemplate: z.string().optional().nullable(),
  leaderUserIds: z.array(z.string()).optional(),
});

async function requireAdminOrMaster() {
  const session = await auth();
  if (!session?.user) return null;
  const role = (session.user as any).role;
  if (role !== "ADMIN" && role !== "MASTER") return null;
  return session;
}

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const groups = await prisma.group.findMany({
    orderBy: { name: "asc" },
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

  return NextResponse.json(groups);
}

export async function POST(req: Request) {
  const session = await requireAdminOrMaster();
  if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 403 });

  const body = await req.json();
  const parsed = createGroupSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { name, description, whatsappTemplate, leaderUserIds = [] } = parsed.data;

  const existing = await prisma.group.findUnique({ where: { name } });
  if (existing) {
    return NextResponse.json({ error: `Já existe um grupo com o nome "${name}"` }, { status: 409 });
  }

  const group = await prisma.group.create({
    data: {
      name,
      description: description || null,
      whatsappTemplate: whatsappTemplate || null,
      active: true,
      leaders: {
        create: leaderUserIds.map((userId) => ({ userId })),
      },
    },
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

  return NextResponse.json(group, { status: 201 });
}
