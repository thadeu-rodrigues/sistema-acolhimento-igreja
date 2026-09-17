// prisma/seed.ts
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Iniciando seed do banco de dados...");

  // ── 1. Criar os Grupos Ministeriais ──────────────────────
  const groups = [
    {
      name: "VOLTZ",
      description: "Adolescentes — 13 a 17 anos",
      whatsappTemplate:
        "Olá {nome}! Sou {lider} da rede Voltz da Igreja da Cidade Taubaté. Vi que você nos visitou e quero saber como você está!",
    },
    {
      name: "BOLD",
      description: "Jovens — 18 a 26 anos",
      whatsappTemplate:
        "Olá {nome}! Sou {lider} da rede Bold da Igreja da Cidade Taubaté. Que alegria ter você conosco! Posso te contar mais sobre nossa comunidade?",
    },
    {
      name: "BURN",
      description: "Jovens Adultos — 27 a 35 anos",
      whatsappTemplate:
        "Olá {nome}! Sou {lider} da rede Burn da Igreja da Cidade Taubaté. Foi incrível ter você em nosso culto!",
    },
    {
      name: "A3",
      description: "Casais e Família",
      whatsappTemplate:
        "Olá {nome}! Sou {lider} da rede A3 da Igreja da Cidade Taubaté. Que alegria receber vocês! Adoraria conversar mais sobre nossa comunidade de casais.",
    },
  ];

  for (const group of groups) {
    await prisma.group.upsert({
      where: { name: group.name },
      update: {},
      create: group,
    });
  }
  console.log("✅ Grupos criados:", groups.map((g) => g.name).join(", "));

  // Senha padrão inicial para todos os usuários
  const defaultPassword = await bcrypt.hash("adminictaubate123@", 12);

  // ── 2. Criar Usuário Admin Padrão ────────────────────────
  const adminUser = "admin";

  await prisma.user.upsert({
    where: { email: adminUser },
    update: {
      passwordHash: defaultPassword,
      role: "ADMIN",
      active: true,
    },
    create: {
      name: "Administrador",
      email: adminUser,
      passwordHash: defaultPassword,
      role: "ADMIN",
      active: true,
    },
  });
  console.log(`✅ Admin: ${adminUser} / adminictaubate123@`);

  // ── 3. Criar Usuário Master de Exemplo ──────────────────
  const masterUser = "master";

  await prisma.user.upsert({
    where: { email: masterUser },
    update: {
      passwordHash: defaultPassword,
      role: "MASTER",
      active: true,
    },
    create: {
      name: "Coordenação Ministerial",
      email: masterUser,
      passwordHash: defaultPassword,
      role: "MASTER",
      active: true,
    },
  });
  console.log(`✅ Master: ${masterUser} / adminictaubate123@`);

  // ── 4. Criar Líderes de Exemplo ──────────────────────────
  const leaders = [
    { name: "Líder Voltz",  username: "voltz",  group: "VOLTZ" },
    { name: "Líder Bold",   username: "bold",   group: "BOLD"  },
    { name: "Líder Burn",   username: "burn",   group: "BURN"  },
    { name: "Líder A3",     username: "a3",     group: "A3"    },
  ];

  for (const l of leaders) {
    const user = await prisma.user.upsert({
      where: { email: l.username },
      update: {
        name: l.name,
        passwordHash: defaultPassword,
        role: "LEADER",
        active: true,
      },
      create: {
        name: l.name,
        email: l.username,
        passwordHash: defaultPassword,
        role: "LEADER",
        active: true,
      },
    });

    const group = await prisma.group.findUnique({ where: { name: l.group } });
    if (group) {
      await prisma.leaderGroup.upsert({
        where: { userId_groupId: { userId: user.id, groupId: group.id } },
        update: {},
        create: { userId: user.id, groupId: group.id, isPrimary: true },
      });
    }
    console.log(`✅ Líder: ${l.username} (${l.group}) / adminictaubate123@`);
  }
  // ── 5. Criar Visitantes de Exemplo para Teste ───────────
  const sampleVisitors = [
    {
      fullName: "Lucas Silva",
      phone: "(12) 99123-4567",
      neighborhood: "Jardim das Nações",
      city: "Taubaté",
      maritalStatus: "SOLTEIRO",
      birthDate: new Date("2009-05-14"),
      calculatedAge: 17,
      visitReason: "PRIMEIRA_VEZ",
      decisions: JSON.stringify(["ACEITAR_JESUS"]),
      groupName: "VOLTZ",
      status: "NOVO",
    },
    {
      fullName: "Beatriz Oliveira",
      phone: "(12) 98234-5678",
      neighborhood: "Independência",
      city: "Taubaté",
      maritalStatus: "SOLTEIRO",
      birthDate: new Date("2003-08-20"),
      calculatedAge: 23,
      visitReason: "PRIMEIRA_VEZ",
      decisions: JSON.stringify(["BATISMO"]),
      groupName: "BOLD",
      status: "EM_CONTATO",
    },
    {
      fullName: "Rodrigo Almeida",
      phone: "(12) 97345-6789",
      neighborhood: "Vila Jaboticabeira",
      city: "Taubaté",
      maritalStatus: "SOLTEIRO",
      birthDate: new Date("1996-03-10"),
      calculatedAge: 30,
      visitReason: "DECISAO",
      decisions: JSON.stringify(["RECONCILIACAO"]),
      groupName: "BURN",
      status: "NOVO",
    },
    {
      fullName: "Marcos & Fernanda Santos",
      phone: "(12) 99876-5432",
      neighborhood: "Bonfim",
      city: "Taubaté",
      maritalStatus: "CASADO",
      birthDate: new Date("1994-11-25"),
      calculatedAge: 31,
      visitReason: "PRIMEIRA_VEZ",
      decisions: JSON.stringify([]),
      groupName: "A3",
      status: "INTEGRADO",
    },
    {
      fullName: "Cláudia Mendonça",
      phone: "(12) 98765-4321",
      neighborhood: "Centro",
      city: "Pindamonhangaba",
      maritalStatus: "VIUVO",
      birthDate: new Date("1970-07-12"),
      calculatedAge: 56,
      visitReason: "PRIMEIRA_VEZ",
      decisions: JSON.stringify(["ACEITAR_JESUS"]),
      groupName: "BURN",
      status: "NOVO",
    },
    {
      fullName: "Gabriel Costa",
      phone: "(12) 99234-1122",
      neighborhood: "Quiririm",
      city: "Taubaté",
      maritalStatus: "SOLTEIRO",
      birthDate: new Date("2010-02-18"),
      calculatedAge: 16,
      visitReason: "PRIMEIRA_VEZ",
      decisions: JSON.stringify(["BATISMO"]),
      groupName: "VOLTZ",
      status: "EM_CONTATO",
    },
    {
      fullName: "Camila Lima",
      phone: "(12) 98111-2233",
      neighborhood: "Estoril",
      city: "Taubaté",
      maritalStatus: "SOLTEIRO",
      birthDate: new Date("2004-11-05"),
      calculatedAge: 21,
      visitReason: "DECISAO",
      decisions: JSON.stringify(["ACEITAR_JESUS", "BATISMO"]),
      groupName: "BOLD",
      status: "INTEGRADO",
    },
    {
      fullName: "Thiago & Juliana Moreira",
      phone: "(12) 99777-8899",
      neighborhood: "Jardim Santa Clara",
      city: "Taubaté",
      maritalStatus: "NOIVO",
      birthDate: new Date("1997-04-14"),
      calculatedAge: 29,
      visitReason: "PRIMEIRA_VEZ",
      decisions: JSON.stringify([]),
      groupName: "A3",
      status: "EM_CONTATO",
    },
    {
      fullName: "Matheus Pereira",
      phone: "(12) 98822-3344",
      neighborhood: "Areão",
      city: "Taubaté",
      maritalStatus: "SOLTEIRO",
      birthDate: new Date("1993-09-22"),
      calculatedAge: 32,
      visitReason: "PRIMEIRA_VEZ",
      decisions: JSON.stringify(["EVANGELISMO"]),
      groupName: "BURN",
      status: "INTEGRADO",
    },
    {
      fullName: "Larissa Faria",
      phone: "(12) 97444-5566",
      neighborhood: "Mantiqueira",
      city: "Taubaté",
      maritalStatus: "SOLTEIRO",
      birthDate: new Date("2002-06-30"),
      calculatedAge: 24,
      visitReason: "PRIMEIRA_VEZ",
      decisions: JSON.stringify(["ACEITAR_JESUS"]),
      groupName: "BOLD",
      status: "NOVO",
    },
    {
      fullName: "Felipe Andrade",
      phone: "(12) 99666-3322",
      neighborhood: "Parque Paduan",
      city: "Taubaté",
      maritalStatus: "DIVORCIADO",
      birthDate: new Date("1988-12-01"),
      calculatedAge: 37,
      visitReason: "DECISAO",
      decisions: JSON.stringify(["RECONCILIACAO"]),
      groupName: "BURN",
      status: "SEM_RESPOSTA",
    },
  ];

  for (const sv of sampleVisitors) {
    const group = await prisma.group.findUnique({ where: { name: sv.groupName } });
    if (group) {
      const existing = await prisma.visitor.findFirst({
        where: { fullName: sv.fullName, phone: sv.phone },
      });
      if (!existing) {
        await prisma.visitor.create({
          data: {
            fullName: sv.fullName,
            phone: sv.phone,
            neighborhood: sv.neighborhood,
            city: sv.city,
            maritalStatus: sv.maritalStatus,
            birthDate: sv.birthDate,
            calculatedAge: sv.calculatedAge,
            visitReason: sv.visitReason,
            decisions: sv.decisions,
            groupId: group.id,
            status: sv.status,
          },
        });
      } else {
        await prisma.visitor.update({
          where: { id: existing.id },
          data: { groupId: group.id },
        });
      }
    }
  }
  console.log(`✅ Visitantes de exemplo criados (${sampleVisitors.length})`);

  console.log("\n🎉 Seed concluído!");
  console.log("\n⚠️  ALTERE as senhas após o primeiro login!\n");
}

main()
  .catch((e) => {
    console.error("❌ Erro no seed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
