# ⛪ Sistema de Acolhimento e Gestão de Visitantes

<p align="center">
  <img src="public/social-preview.png" alt="Sistema de Acolhimento - Banner" width="100%" />
</p>

> Plataforma moderna para recepção, triagem inteligente e acolhimento de novos visitantes em comunidades de fé.  
> Desenvolvida originalmente para a **Igreja da Cidade Taubaté**, com arquitetura modular facilmente adaptável a **qualquer igreja ou ministério**.

[![Next.js](https://img.shields.io/badge/Next.js-15-black?style=for-the-badge&logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-3178C6?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org/)
[![Prisma](https://img.shields.io/badge/Prisma-5.22-2D3748?style=for-the-badge&logo=prisma)](https://www.prisma.io/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-4169E1?style=for-the-badge&logo=postgresql)](https://www.postgresql.org/)
[![Auth.js](https://img.shields.io/badge/Auth.js-v5-purple?style=for-the-badge)](https://authjs.dev/)
[![Docker](https://img.shields.io/badge/Docker-Ready-2496ED?style=for-the-badge&logo=docker)](https://www.docker.com/)
[![LinkedIn](https://img.shields.io/badge/LinkedIn-Thadeu_Rodrigues-0A66C2?style=for-the-badge&logo=linkedin)](https://www.linkedin.com/in/thadeu-rodrigues-46b055369/)

---

## 📌 Visão Geral

O objetivo principal desta aplicação é transformar a experiência de quem visita a igreja pela primeira vez, eliminando fichas de papel e conectando rapidamente os novos visitantes aos líderes de redes e pequenos grupos.

Com uma interface mobile-first de alto desempenho, o visitante escaneia um QR Code exibido no telão durante o culto, preenche seus dados em menos de 1 minuto e o sistema automaticamente:
1. **Calcula a idade exata** do visitante.
2. **Direciona para a rede ideal** (ex: Adolescentes, Jovens, Adultos ou Família/Casais).
3. **Disponibiliza no painel do líder** um botão de contato em 1 clique via WhatsApp com mensagem personalizada.
4. **Alimenta métricas e relatórios** em tempo real para a coordenação pastoral.

---

## 🚀 Funcionalidades

### 📱 Para o Visitante (Público)
- **Formulário Dinâmico & Rápido**: Interface limpa e otimizada para smartphones (iOS e Android), sem necessidade de login ou download de aplicativo.
- **Máscara Inteligente de Telefone**: Correção automática para números colados da agenda ou autopreenchimento com prefixos `+55` ou `0`.
- **Registro de Decisões de Fé**: Opção para assinalar decisões tomadas durante a reunião (ex: *Aceitar Jesus*, *Reconciliação*, *Batismo*).
- **Página de Confirmação & Integração**: Mensagem calorosa de boas-vindas com link direto para o Instagram oficial da igreja.

### 🧠 Algoritmo de Roteamento Inteligente
- **Prioridade Familiar**: Visitantes casados ou noivos são direcionados automaticamente para a rede de **Casais / Família (A3)**.
- **Segmentação por Faixa Etária**: Visitantes solteiros, divorciados ou viúvos são distribuídos conforme a idade:
  - **Até 17 anos**: Rede de Adolescentes (`VOLTZ`)
  - **18 a 26 anos**: Rede de Jovens (`BOLD`)
  - **27 anos ou mais**: Rede de Jovens Adultos (`BURN`)

### 📊 Painel Administrativo com Controle de Acesso (RBAC)
- **Perfil Líder**:
  - Visualiza somente os visitantes designados para a sua rede.
  - Cartões de contato com botão direto de WhatsApp.
  - Atualização de status do acolhimento (*Novo*, *Em Contato*, *Integrado*, *Sem Resposta*, *Arquivado*).
  - Adição de notas e observações pastorais.
- **Perfil Master (Coordenação Ministerial)**:
  - Visão geral de todos os visitantes de todas as redes.
  - Funil de acolhimento e gráficos de taxa de integração.
  - Distribuição demográfica por rede, estado civil e decisões tomadas.
  - Gestão e customização das redes e templates de WhatsApp.
  - Exportação completa em formato CSV para Excel ou Google Sheets.
- **Perfil Administrador**:
  - Todas as funções Master + gerenciamento de usuários, atribuição de líderes a redes e redefinição de senhas.

### 🖨️ Central de QR Code & Link de Compartilhamento
- Gerador integrado de QR Code de alta resolução com logotipo centralizado.
- Botões para copiar link direto, baixar PNG de alta qualidade e pré-visualizar antes da projeção nos telões do culto.

---

## 🛠️ Stack Tecnológica

| Camada | Tecnologia |
|---|---|
| **Framework** | [Next.js 15](https://nextjs.org/) (App Router, Server Actions) |
| **Linguagem** | [TypeScript](https://www.typescriptlang.org/) |
| **Banco de Dados** | [PostgreSQL 16](https://www.postgresql.org/) |
| **ORM** | [Prisma ORM](https://www.prisma.io/) |
| **Autenticação** | [Auth.js v5](https://authjs.dev/) (NextAuth com JWT Session) |
| **Criptografia** | [Bcryptjs](https://github.com/dcodeIO/bcrypt.js) |
| **Validação** | [Zod](https://zod.dev/) |
| **Estilização** | Vanilla CSS Moderno (Design Tokens, Dark/Light Mode, Responsividade Nativa) |
| **Deploy & Infra** | Docker, Docker Compose, suporte a Coolify / VPS / Cloud |

---

## 📂 Estrutura de Diretórios

```plaintext
├── prisma/
│   └── schema.prisma         # Modelagem do banco de dados relacional
├── public/
│   ├── logo-ic.png           # Logotipo da igreja
│   └── og-image.jpg          # Imagem de compartilhamento social (WhatsApp / redes)
├── scripts/
│   ├── create_db.js          # Criação auxiliar do banco de dados PostgreSQL
│   └── seed_pg.js            # Carga de dados iniciais (redes e usuários padrão)
├── src/
│   ├── app/
│   │   ├── actions/          # Server Actions (submissão de visitantes)
│   │   ├── api/              # Endpoints REST (auth, redes, usuários, status)
│   │   ├── components/       # Componentes compartilhados (VisitorForm)
│   │   ├── dashboard/        # Painel administrativo, métricas e QR Code
│   │   ├── login/            # Tela de autenticação interna
│   │   ├── obrigado/         # Página de agradecimento pós-cadastro
│   │   ├── globals.css       # Design System em CSS puro
│   │   ├── layout.tsx        # Layout raiz e metadados SEO/OpenGraph
│   │   └── page.tsx          # Página principal (Formulário do Visitante)
│   ├── lib/
│   │   ├── auth.ts           # Configuração do Auth.js
│   │   ├── prisma.ts         # Singleton do Prisma Client
│   │   └── routing/          # Regras de negócio e algoritmo de triagem
│   └── middleware.ts         # Proteção de rotas autenticadas
├── docker-compose.yml        # Banco de dados PostgreSQL para desenvolvimento
├── docker-compose.prod.yml   # Stack completa de produção com Docker
├── Dockerfile                # Build multi-stage para deploy
└── package.json
```

---

## 💻 Como Rodar o Projeto Localmente

### 1. Pré-requisitos
- [Node.js](https://nodejs.org/) versão 20 LTS ou superior
- [Git](https://git-scm.com/)
- [Docker](https://www.docker.com/) e Docker Compose (recomendado para o banco de dados)

### 2. Clonar o Repositório
```bash
git clone https://github.com/thadeu-rodrigues/sistema-acolhimento-igreja.git
cd sistema-acolhimento-igreja
```

### 3. Instalar Dependências
```bash
npm install
```

### 4. Configurar as Variáveis de Ambiente
Crie um arquivo `.env` na raiz do projeto baseado no `.env.example`:

```bash
cp .env.example .env
```

Edite o arquivo `.env`:
```env
# Conexão com o PostgreSQL local
DATABASE_URL="postgresql://ictaubate:ictaubate_dev@localhost:5432/ictaubate?schema=public"

# Chave secreta de autenticação (gere com: openssl rand -base64 32)
AUTH_SECRET="sua_chave_secreta_longa_e_aleatoria"
NEXTAUTH_URL="http://localhost:3000"

# URL pública da aplicação
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

### 5. Iniciar o Banco de Dados com Docker
Suba a instância do PostgreSQL via Docker Compose:
```bash
docker compose up -d
```

### 6. Executar as Migrações do Prisma
```bash
npx prisma migrate dev
```

### 7. Popular o Banco com os Dados Iniciais (Seed)
Execute o script de seed para criar as redes ministeriais e os usuários de acesso:
```bash
node scripts/seed_pg.js
```

> **Acessos criados pelo seed:**
> - **Administrador**: usuário `admin` / senha padrão: `adminictaubate123@`
> - **Coordenação (Master)**: usuário `master` / senha padrão: `adminictaubate123@`
> - **Líderes de Rede**: usuários `voltz`, `bold`, `burn`, `a3` / senha: `adminictaubate123@`
> *(Recomenda-se alterar as senhas imediatamente através do painel de administração)*

### 8. Iniciar o Servidor de Desenvolvimento
```bash
npm run dev
```

Abra [http://localhost:3000](http://localhost:3000) no seu navegador:
- Formulário do Visitante: [http://localhost:3000](http://localhost:3000)
- Painel Administrativo: [http://localhost:3000/login](http://localhost:3000/login)

---

## 🎨 Como Adaptar para a Sua Igreja

Este projeto foi construído para ser modular e flexível:

1. **Nome e Logotipo da Igreja**:
   - Substitua o arquivo `public/logo-ic.png` pelo logo da sua comunidade.
   - Atualize os textos e títulos em `src/app/layout.tsx` e `src/app/components/VisitorForm.tsx`.
2. **Redes e Faixas Etárias**:
   - As regras de distribuição etária e estado civil estão centralizadas em `src/lib/routing/groupRouter.ts`.
   - Você pode renomear os grupos (`VOLTZ`, `BOLD`, etc.) para os nomes dos ministérios da sua igreja (ex: *Kids*, *Conectados*, *Casais*, *Melhor Idade*).
3. **Templates de Mensagem do WhatsApp**:
   - Cada rede possui seu próprio modelo de mensagem salvo no banco de dados e editável diretamente no painel administrativo pelo usuário **Master** ou **Admin**.
   - As variáveis `{nome}` e `{lider}` são substituídas automaticamente na hora do clique.

---

## 🤖 Como Criar e Configurar o Bot do Telegram (Notificações)

A aplicação permite enviar notificações automáticas em tempo real para a liderança ou para um canal/grupo da equipe de acolhimento sempre que um novo visitante preencher o formulário.

Siga o passo a passo para criar e configurar o seu bot:

### 1. Criar o Bot no Telegram
1. Abra o seu aplicativo do **Telegram** e busque por `@BotFather` (conta oficial verificada com selo azul).
2. Inicie a conversa enviando o comando `/start`.
3. Digite o comando `/newbot` para criar um novo bot.
4. Escolha um **nome de exibição** para o bot (ex: `Acolhimento IC Taubaté`).
5. Escolha um **username** único terminado em `bot` (ex: `ictaubate_acolhimento_bot`).
6. O `@BotFather` irá responder com uma mensagem de sucesso contendo o seu **Token de Acesso (HTTP API)**.
   - *Exemplo de token*: `7123456789:AAFq_b_xYz12345AbcDEfGhIjKlMnOpQrSt`
   - Guarde este valor, ele será o seu `TELEGRAM_BOT_TOKEN`.

---

### 2. Obter o Chat ID (Onde o bot enviará as mensagens)

Você pode enviar as notificações para um **chat privado** (seu próprio Telegram) ou para um **grupo/canal da equipe pastoral**:

#### Opção A: Notificar um Grupo ou Canal da Igreja (Recomendado)
1. Crie um grupo no Telegram (ex: `Equipe Acolhimento - Visitantes`).
2. Adicione o seu bot recém-criado como membro deste grupo.
3. Conceda permissão de administrador ao bot para enviar mensagens.
4. Envie qualquer mensagem de teste no grupo (ex: *"Oi bot"*).
5. Abra seu navegador e acesse a URL da API substituindo pelo token do seu bot:
   ```text
   https://api.telegram.org/bot<SEU_BOT_TOKEN>/getUpdates
   ```
6. No JSON retornado, localize a propriedade `"chat":{"id": -100xxxxxxxxxx, ...}`.
   - O número negativo (geralmente começando com `-100...` ou `-...`) é o seu `TELEGRAM_CHAT_ID`.

#### Opção B: Notificar seu Chat Privado
1. Abra o bot que você criou no Telegram e clique em **Iniciar** (`/start`).
2. Acesse no navegador:
   ```text
   https://api.telegram.org/bot<SEU_BOT_TOKEN>/getUpdates
   ```
3. Procure pelo `"chat":{"id": 123456789, ...}`. Esse número positivo é o seu `TELEGRAM_CHAT_ID`.
   *(Como alternativa rápida, basta enviar qualquer mensagem para o bot `@userinfobot` no Telegram para ver seu ID numérico).*

---

### 3. Configurar no Arquivo `.env`
Adicione as credenciais no seu arquivo `.env`:

```env
# ----- Notificações via Telegram -----
TELEGRAM_BOT_TOKEN="7123456789:AAFq_b_xYz12345AbcDEfGhIjKlMnOpQrSt"
TELEGRAM_CHAT_ID="-1001234567890"
```

Pronto! Seu bot já estará apto a disparar alertas de novos visitantes diretamente para a sua equipe.

---

## 🐳 Deploy em Produção

O projeto inclui um `Dockerfile` otimizado em múltiplos estágios com suporte ao Next.js Standalone.

Para rodar com Docker Compose em produção:
```bash
docker compose -f docker-compose.prod.yml up -d --build
```

Compatível com:
- **Coolify / Dokku** (Self-hosted PaaS)
- **VPS Linux** (Ubuntu / Debian com Docker e Nginx Reverse Proxy)
- **Vercel / Railway / Render**

---

## 👨‍💻 Autor

Desenvolvido por **Thadeu Rodrigues**.

[![LinkedIn](https://img.shields.io/badge/LinkedIn-Thadeu_Rodrigues-0A66C2?style=for-the-badge&logo=linkedin)](https://www.linkedin.com/in/thadeu-rodrigues-46b055369/)

Sinta-se à vontade para se conectar comigo no LinkedIn:  
🔗 [linkedin.com/in/thadeu-rodrigues-46b055369](https://www.linkedin.com/in/thadeu-rodrigues-46b055369/)

---

## 📄 Licença

Este projeto está sob a licença [MIT](https://opensource.org/licenses/MIT). Sinta-se livre para utilizar, modificar e distribuir em sua igreja ou projeto.
