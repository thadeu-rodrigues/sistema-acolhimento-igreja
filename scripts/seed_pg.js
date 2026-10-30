const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

async function main() {
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

  for (const g of groups) {
    await prisma.group.upsert({
      where: { name: g.name },
      update: { description: g.description, whatsappTemplate: g.whatsappTemplate },
      create: g,
    });
  }

  const initialPassword = process.env.INITIAL_SEED_PASSWORD || "adminictaubate123@";
  const defaultPassword = await bcrypt.hash(initialPassword, 12);

  // 2. Admin
  await prisma.user.upsert({
    where: { email: "admin" },
    update: {
      name: "Administrador",
      passwordHash: defaultPassword,
      role: "ADMIN",
      active: true,
    },
    create: {
      name: "Administrador",
      email: "admin",
      passwordHash: defaultPassword,
      role: "ADMIN",
      active: true,
    },
  });
  console.log("✅ Usuário Admin: admin / adminictaubate123@");

  // 3. Master
  await prisma.user.upsert({
    where: { email: "master" },
    update: {
      name: "Coordenação Ministerial",
      passwordHash: defaultPassword,
      role: "MASTER",
      active: true,
    },
    create: {
      name: "Coordenação Ministerial",
      email: "master",
      passwordHash: defaultPassword,
      role: "MASTER",
      active: true,
    },
  });
  console.log("✅ Usuário Master: master / adminictaubate123@");

  // 4. Líderes
  const leaders = [
    { username: "voltz", name: "Líder Voltz", group: "VOLTZ" },
    { username: "bold",  name: "Líder Bold",  group: "BOLD"  },
    { username: "burn",  name: "Líder Burn",  group: "BURN"  },
    { username: "a3",    name: "Líder A3",    group: "A3"    },
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
        update: { isPrimary: true },
        create: { userId: user.id, groupId: group.id, isPrimary: true },
      });
    }
    console.log(`✅ Líder: ${l.username} (${l.group}) / adminictaubate123@`);
  }

  console.log("🎉 Seed PostgreSQL concluído com sucesso!");
}

main()
  .catch((e) => {
    console.error("Erro no seed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
