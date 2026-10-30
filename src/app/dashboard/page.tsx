import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import DashboardClient from "@/app/dashboard/DashboardClient";

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const role = (session.user as any).role as string;
  const userId = session.user.id as string;

  // ── Buscar visitantes de acordo com a role ──────────────
  let visitors: any[] = [];
  let groups: any[] = [];
  let users: any[] = [];

  if (role === "LEADER") {
    // Lider: só vê visitantes das suas redes
    const leaderGroups = await prisma.leaderGroup.findMany({
      where: { userId },
      include: { group: true },
    });
    const groupIds = leaderGroups.map((lg: any) => lg.groupId);

    visitors = await prisma.visitor.findMany({
      where: { groupId: { in: groupIds } },
      include: { group: true, assignedLeader: true },
      orderBy: { createdAt: "desc" },
    });
    groups = leaderGroups.map((lg: any) => lg.group);

  } else {
    // MASTER e ADMIN: veem todos os visitantes
    visitors = await prisma.visitor.findMany({
      include: { group: true, assignedLeader: true },
      orderBy: { createdAt: "desc" },
    });
    groups = await prisma.group.findMany({
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

    if (role === "ADMIN" || role === "MASTER") {
      users = await prisma.user.findMany({
        orderBy: { name: "asc" },
        include: {
          leaderGroups: { include: { group: true } },
        },
      });
    }
  }

  return (
    <DashboardClient
      session={session}
      role={role}
      visitors={JSON.parse(JSON.stringify(visitors))}
      groups={JSON.parse(JSON.stringify(groups))}
      users={JSON.parse(JSON.stringify(users))}
    />
  );
}
