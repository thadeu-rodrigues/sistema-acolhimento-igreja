// src/app/api/users/route.ts
// GET: listar usuários | POST: criar usuário

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";

const createSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  phone: z.string().optional(),
  password: z.string().min(6),
  role: z.enum(["ADMIN", "MASTER", "LEADER"]),
  groupIds: z.array(z.string()).optional(),
});

async function requireAdminOrMaster() {
  const session = await auth();
  if (!session?.user) return null;
  const role = (session.user as any).role;
  if (role !== "ADMIN" && role !== "MASTER") return null;
  return session;
}

export async function GET() {
  const session = await requireAdminOrMaster();
  if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 403 });

  const users = await prisma.user.findMany({
    orderBy: { name: "asc" },
    include: {
      leaderGroups: { include: { group: true } },
    },
  });

  return NextResponse.json(users);
}

export async function POST(req: Request) {
  const session = await requireAdminOrMaster();
  if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 403 });

  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { name, email, phone, password, role, groupIds = [] } = parsed.data;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json({ error: "E-mail já cadastrado" }, { status: 409 });
  }

  const passwordHash = await bcrypt.hash(password, 12);

  const user = await prisma.user.create({
    data: {
      name, email, phone: phone || null, passwordHash, role, active: true,
      leaderGroups: {
        create: groupIds.map((groupId) => ({ groupId })),
      },
    },
    include: { leaderGroups: { include: { group: true } } },
  });

  return NextResponse.json(user, { status: 201 });
}
