"use client";

import { signOut } from "next-auth/react";
import { useState, useCallback, useMemo, useEffect, Fragment } from "react";
import QrCodeSection from "./QrCodeSection";
import QrCodeModal from "./QrCodeModal";

// ── Tipos ────────────────────────────────────────────────
type Visitor = {
  id: string;
  fullName: string;
  phone: string;
  city: string;
  neighborhood: string;
  maritalStatus: string;
  birthDate?: string;
  calculatedAge: number;
  visitReason: string;
  decisions: string | null;
  status: string;
  createdAt: string;
  group: { id: string; name: string; description: string | null; whatsappTemplate?: string | null };
  assignedLeader: { name: string } | null;
};

type LeaderInGroup = {
  user: {
    id: string;
    name: string;
    email: string;
    phone: string | null;
    role: string;
    active: boolean;
  };
};

type Group = {
  id: string;
  name: string;
  description: string | null;
  whatsappTemplate?: string | null;
  active?: boolean;
  leaders?: LeaderInGroup[];
};

type UserGroup = { groupId: string; group: Group };

type User = {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  role: string;
  active: boolean;
  leaderGroups?: UserGroup[];
};

type Props = {
  session: any;
  role: string;
  visitors: Visitor[];
  groups: Group[];
  users: User[];
};

// ── Constantes & Helpers ─────────────────────────────────
const STATUS_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  NOVO:         { label: "Novo",          color: "#2563eb", bg: "#eff6ff" },
  EM_CONTATO:   { label: "Em Contato",    color: "#d97706", bg: "#fffbeb" },
  INTEGRADO:    { label: "Integrado",     color: "#16a34a", bg: "#f0fdf4" },
  SEM_RESPOSTA: { label: "Sem Resposta",  color: "#9ca3af", bg: "#f9fafb" },
  ARQUIVADO:    { label: "Arquivado",     color: "#6b7280", bg: "#f3f4f6" },
};

const GROUP_COLORS: Record<string, { color: string; bg: string; title: string }> = {
  VOLTZ:   { color: "#7c3aed", bg: "#f5f3ff", title: "Adolescentes (até 17 anos)" },
  BOLD:    { color: "#E8351A", bg: "#fff1f0", title: "Jovens (18 a 26 anos)" },
  BURN:    { color: "#ea580c", bg: "#fff7ed", title: "Adultos (27+ anos)" },
  A3:      { color: "#0891b2", bg: "#ecfeff", title: "Casais & Família" },
};

const ROLE_BADGES: Record<string, { label: string; color: string; bg: string }> = {
  ADMIN:  { label: "Admin", color: "#ffffff", bg: "#0A0A0A" },
  MASTER: { label: "Master", color: "#ffffff", bg: "#7c3aed" },
  LEADER: { label: "Líder", color: "#ffffff", bg: "#E8351A" },
};

const DECISION_MAP: Record<string, string> = {
  ACEITAR_JESUS: "Aceitar Jesus",
  RECONCILIACAO: "Reconciliação",
  BATISMO:       "Batismo",
  EVANGELISMO:   "Evangelismo",
};

const MARITAL_LABELS: Record<string, string> = {
  SOLTEIRO:   "Solteiro(a)",
  CASADO:     "Casado(a)",
  NOIVO:      "Noivo(a)",
  DIVORCIADO: "Divorciado(a)",
  VIUVO:      "Viúvo(a)",
};

const VISIT_REASON_LABELS: Record<string, string> = {
  PRIMEIRA_VEZ: "Primeira Vez",
  DECISAO:      "Tomei uma Decisão",
};

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatBirthDate(d?: string | null) {
  if (!d) return "Não informado";
  try {
    if (d.includes("T")) {
      const [year, month, day] = d.split("T")[0].split("-");
      if (year && month && day) return `${day}/${month}/${year}`;
    }
    const date = new Date(d);
    return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "UTC" });
  } catch {
    return String(d);
  }
}

function whatsappUrl(phone: string, name: string, template?: string | null, leaderName?: string) {
  const digits = phone.replace(/\D/g, "");
  const firstName = name.trim().split(" ")[0];
  let text = template;
  if (text) {
    text = text.replace(/\{nome\}/gi, firstName).replace(/\{lider\}/gi, leaderName || "da equipe de acolhimento");
  } else {
    text = `Olá ${firstName}! Sou da equipe de acolhimento da Igreja da Cidade Taubaté. Que alegria ter você conosco! Como podemos orar por você?`;
  }
  return `https://wa.me/55${digits}?text=${encodeURIComponent(text)}`;
}

function formatPhoneInput(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  if (digits.length === 0) return "";
  if (digits.length <= 2) return `(${digits}`;
  if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

// ── Exportação CSV para Excel / Google Sheets ─────────────
function exportToCSV(visitorsToExport: Visitor[], filename = "relatorio_acolhimento_ictaubate.csv") {
  const headers = [
    "Nome Completo",
    "Telefone",
    "Rede Ministerial",
    "Data de Nascimento",
    "Idade",
    "Cidade",
    "Bairro",
    "Estado Civil",
    "Motivo da Visita",
    "Decisões de Fé",
    "Status Atual",
    "Data de Cadastro",
    "Líder Designado",
  ];

  const escapeCSV = (value: string | number | null | undefined) => {
    if (value === null || value === undefined) return '""';
    const clean = String(value).replace(/"/g, '""');
    return `"${clean}"`;
  };

  const rows = visitorsToExport.map((v) => {
    const decisions = (() => {
      try {
        const arr = JSON.parse(v.decisions || "[]") as string[];
        return arr.map((d) => DECISION_MAP[d] || d).join(", ");
      } catch {
        return "";
      }
    })();

    const statusLabel = STATUS_LABELS[v.status]?.label || v.status;
    const maritalLabel = MARITAL_LABELS[v.maritalStatus] || v.maritalStatus;
    const visitReasonLabel = VISIT_REASON_LABELS[v.visitReason] || v.visitReason;

    return [
      escapeCSV(v.fullName),
      escapeCSV(v.phone),
      escapeCSV(v.group?.name || ""),
      escapeCSV(formatBirthDate(v.birthDate)),
      escapeCSV(v.calculatedAge),
      escapeCSV(v.city),
      escapeCSV(v.neighborhood),
      escapeCSV(maritalLabel),
      escapeCSV(visitReasonLabel),
      escapeCSV(decisions),
      escapeCSV(statusLabel),
      escapeCSV(formatDate(v.createdAt)),
      escapeCSV(v.assignedLeader?.name || "Não atribuído"),
    ].join(";");
  });

  const csvContent = "\uFEFF" + [headers.join(";"), ...rows].join("\r\n");
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// ── Componente Principal ──────────────────────────────────
export default function DashboardClient({
  session,
  role,
  visitors: initialVisitors,
  groups: initialGroups,
  users: initialUsers,
}: Props) {
  const isMasterOrAdmin = role === "MASTER" || role === "ADMIN";
  const isAdmin = role === "ADMIN";

  const [activeTab, setActiveTab] = useState<"analytics" | "visitors" | "networks" | "users" | "qrcode">(
    isMasterOrAdmin ? "analytics" : "visitors"
  );
  const [showQrModal, setShowQrModal] = useState(false);

  const [visitors, setVisitors] = useState<Visitor[]>(initialVisitors);
  const [users, setUsers] = useState<User[]>(initialUsers);
  const [groups, setGroups] = useState<Group[]>(initialGroups);

  // Filtros
  const [filterGroup, setFilterGroup] = useState("ALL");
  const [filterStatus, setFilterStatus] = useState("ALL");
  const [filterDecision, setFilterDecision] = useState("ALL");
  const [search, setSearch] = useState("");
  // Em telas pequenas (mobile), iniciar em cartões por padrão
  const [viewMode, setViewMode] = useState<"table" | "cards">("cards");

  useEffect(() => {
    if (typeof window !== "undefined" && window.innerWidth >= 1024) {
      setViewMode("table");
    }
  }, []);

  const [showNewUser, setShowNewUser] = useState(false);
  const [showNewGroup, setShowNewGroup] = useState(false);
  const [expandedRowId, setExpandedRowId] = useState<string | null>(null);

  const handleVisitorStatusChange = (visitorId: string, newStatus: string) => {
    setVisitors((prev) =>
      prev.map((v) => (v.id === visitorId ? { ...v, status: newStatus } : v))
    );
  };

  const handleDeleteVisitor = async (id: string, name: string) => {
    if (!confirm(`Tem certeza que deseja excluir o cadastro de "${name}"? Esta ação não pode ser desfeita.`)) {
      return;
    }
    try {
      const res = await fetch(`/api/visitors/${id}`, { method: "DELETE" });
      if (!res.ok) {
        alert("Erro ao excluir visitante.");
        return;
      }
      setVisitors((prev) => prev.filter((v) => v.id !== id));
      if (expandedRowId === id) setExpandedRowId(null);
    } catch {
      alert("Erro de conexão ao excluir visitante.");
    }
  };

  const refreshUsers = useCallback(async () => {
    const res = await fetch("/api/users");
    if (res.ok) setUsers(await res.json());
  }, []);

  const refreshGroups = useCallback(async () => {
    const res = await fetch("/api/groups");
    if (res.ok) setGroups(await res.json());
  }, []);

  // Lista filtrada de visitantes
  const filteredVisitors = useMemo(() => {
    return visitors.filter((v) => {
      if (filterGroup !== "ALL" && v.group.name !== filterGroup) return false;
      if (filterStatus !== "ALL" && v.status !== filterStatus) return false;
      if (filterDecision !== "ALL") {
        try {
          const decs = JSON.parse(v.decisions || "[]") as string[];
          if (!decs.includes(filterDecision)) return false;
        } catch {
          return false;
        }
      }
      if (search) {
        const query = search.toLowerCase();
        const matchName = v.fullName.toLowerCase().includes(query);
        const matchPhone = v.phone.includes(query);
        const matchCity = v.city.toLowerCase().includes(query);
        const matchNeigh = v.neighborhood.toLowerCase().includes(query);
        if (!matchName && !matchPhone && !matchCity && !matchNeigh) return false;
      }
      return true;
    });
  }, [visitors, filterGroup, filterStatus, filterDecision, search]);

  // Métricas Executivas
  const metrics = useMemo(() => {
    const total = visitors.length;
    const novos = visitors.filter((v) => v.status === "NOVO").length;
    const emContato = visitors.filter((v) => v.status === "EM_CONTATO").length;
    const integrados = visitors.filter((v) => v.status === "INTEGRADO").length;
    const semResposta = visitors.filter((v) => v.status === "SEM_RESPOSTA").length;
    const taxaIntegracao = total > 0 ? Math.round((integrados / total) * 100) : 0;
    const taxaContato = total > 0 ? Math.round(((emContato + integrados) / total) * 100) : 0;

    // Por Rede
    const byGroup: Record<string, { total: number; integrados: number; novos: number; emContato: number }> = {};
    groups.forEach((g) => {
      byGroup[g.name] = { total: 0, integrados: 0, novos: 0, emContato: 0 };
    });
    visitors.forEach((v) => {
      const gName = v.group?.name || "OUTROS";
      if (!byGroup[gName]) {
        byGroup[gName] = { total: 0, integrados: 0, novos: 0, emContato: 0 };
      }
      byGroup[gName].total += 1;
      if (v.status === "INTEGRADO") byGroup[gName].integrados += 1;
      if (v.status === "NOVO") byGroup[gName].novos += 1;
      if (v.status === "EM_CONTATO") byGroup[gName].emContato += 1;
    });

    // Decisões
    const decisionsCount: Record<string, number> = {
      ACEITAR_JESUS: 0,
      BATISMO: 0,
      RECONCILIACAO: 0,
      EVANGELISMO: 0,
    };
    visitors.forEach((v) => {
      try {
        const arr = JSON.parse(v.decisions || "[]") as string[];
        arr.forEach((d) => {
          if (decisionsCount[d] !== undefined) decisionsCount[d] += 1;
        });
      } catch {}
    });

    // Estado Civil
    const maritalCount: Record<string, number> = {};
    visitors.forEach((v) => {
      const m = v.maritalStatus || "NÃO INFORMADO";
      maritalCount[m] = (maritalCount[m] || 0) + 1;
    });

    return {
      total,
      novos,
      emContato,
      integrados,
      semResposta,
      taxaIntegracao,
      taxaContato,
      byGroup,
      decisionsCount,
      maritalCount,
    };
  }, [visitors, groups]);

  const currentRoleBadge = ROLE_BADGES[role] ?? { label: role, color: "#fff", bg: "#333" };

  return (
    <div className="dash-page-container">

      {/* ── Topbar Responsiva (Sem Overflow) ── */}
      <header className="dash-header">
        <div style={{ display: "flex", alignItems: "center", gap: "0.55rem", flexShrink: 0 }}>
          <img
            src="/logo-ic.png"
            alt="Logo IC Taubaté"
            style={{
              width: "2.1rem",
              height: "2.1rem",
              borderRadius: "50%",
              objectFit: "contain",
              display: "block",
              border: "1.5px solid rgba(255,255,255,0.8)",
            }}
          />
          <div style={{ fontWeight: 800, fontSize: "0.95rem", letterSpacing: "-0.02em" }}>
            ACOLHIMENTO<span style={{ color: "#E8351A" }}>*</span>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "0.45rem", flexShrink: 0 }}>
          {/* Botão Acesso Rápido QR Code */}
          <button
            id="header-qrcode-btn"
            type="button"
            onClick={() => setShowQrModal(true)}
            style={{
              background: "rgba(232,53,26,0.18)",
              border: "1px solid rgba(232,53,26,0.4)",
              color: "#ffffff",
              borderRadius: "6px",
              padding: "0.25rem 0.55rem",
              fontSize: "0.72rem",
              fontWeight: 700,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "0.3rem",
              transition: "all 0.15s ease",
            }}
            title="Abrir QR Code do Formulário"
          >
            <span>📱</span>
            <span>QR Code</span>
          </button>

          <span style={{
            background: currentRoleBadge.bg,
            color: currentRoleBadge.color,
            borderRadius: "999px",
            padding: "2px 8px",
            fontSize: "0.68rem",
            fontWeight: 700,
          }}>
            {currentRoleBadge.label}
          </span>

          <button
            id="logout-btn"
            onClick={() => signOut({ callbackUrl: "/login" })}
            style={{
              background: "rgba(255,255,255,0.1)",
              border: "1px solid rgba(255,255,255,0.2)",
              color: "rgba(255,255,255,0.9)",
              borderRadius: "6px",
              padding: "0.25rem 0.6rem",
              fontSize: "0.75rem",
              fontWeight: 500,
              cursor: "pointer",
            }}
          >
            Sair
          </button>
        </div>
      </header>

      {/* ── Abas de Navegação (Design Pill Touch Responsivo) ── */}
      <div className="dash-nav-container">
        <nav className="dash-nav">
          {isMasterOrAdmin && (
            <TabButton
              id="tab-analytics"
              active={activeTab === "analytics"}
              onClick={() => setActiveTab("analytics")}
              icon="📊"
              label="Métricas"
              badge={`${metrics.taxaIntegracao}%`}
            />
          )}

          <TabButton
            id="tab-visitors"
            active={activeTab === "visitors"}
            onClick={() => setActiveTab("visitors")}
            icon="👥"
            label={isMasterOrAdmin ? "Visitantes" : "Meus Visitantes"}
            count={visitors.length}
          />

          {isMasterOrAdmin && (
            <TabButton
              id="tab-networks"
              active={activeTab === "networks"}
              onClick={() => setActiveTab("networks")}
              icon="🏛️"
              label="Redes"
              count={groups.length}
            />
          )}

          {isMasterOrAdmin && (
            <TabButton
              id="tab-users"
              active={activeTab === "users"}
              onClick={() => setActiveTab("users")}
              icon="⚙️"
              label="Usuários"
              count={users.length}
            />
          )}

          <TabButton
            id="tab-qrcode"
            active={activeTab === "qrcode"}
            onClick={() => setActiveTab("qrcode")}
            icon="📱"
            label="QR Code & Link"
          />
        </nav>
      </div>

      {/* ── Conteúdo Principal ── */}
      <main className="dash-main">

        {/* ══════════════════════════════════════════════════════════ */}
        {/* ABA 1: MÉTRICAS & INDICADORES (MASTER / ADMIN)           */}
        {/* ══════════════════════════════════════════════════════════ */}
        {activeTab === "analytics" && isMasterOrAdmin && (
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>

            {/* Topo Métricas */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.6rem" }}>
              <div>
                <h1 style={{ fontSize: "1.2rem", fontWeight: 800, color: "#111827", margin: 0 }}>
                  Painel de Métricas
                </h1>
                <p style={{ fontSize: "0.75rem", color: "#6b7280", margin: "2px 0 0 0" }}>
                  Acompanhamento do acolhimento em tempo real.
                </p>
              </div>

              <button
                id="export-metrics-csv-btn"
                onClick={() => exportToCSV(visitors, `relatorio_geral_${new Date().toISOString().split("T")[0]}.csv`)}
                className="dash-mobile-full"
                style={{
                  background: "#0A0A0A",
                  color: "white",
                  border: "none",
                  borderRadius: "999px",
                  padding: "0.45rem 0.95rem",
                  fontWeight: 600,
                  fontSize: "0.78rem",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "0.4rem",
                }}
              >
                <span>📥</span> Exportar Todos (CSV)
              </button>
            </div>

            {/* Grid de KPIs (2 colunas no mobile, 5 no desktop) */}
            <div className="dash-kpi-grid">
              <KpiCard title="Total" value={metrics.total} subtitle="Cadastros" color="#0A0A0A" icon="👥" />
              <KpiCard title="Novos" value={metrics.novos} subtitle="Pendente contato" color="#2563eb" icon="⚡" highlight={metrics.novos > 0} />
              <KpiCard title="Em Contato" value={metrics.emContato} subtitle="Acompanhamento" color="#d97706" icon="💬" />
              <KpiCard title="Integrados" value={metrics.integrados} subtitle="Membros/Célula" color="#16a34a" icon="✨" />
              <KpiCard title="Taxa de Integração" value={`${metrics.taxaIntegracao}%`} subtitle={`${metrics.taxaContato}% contato iniciado`} color="#7c3aed" icon="📈" isHero />
            </div>

            {/* Funil Visual do Acolhimento */}
            <div style={{ background: "white", borderRadius: "14px", padding: "1.15rem 1rem", boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.85rem", flexWrap: "wrap", gap: "0.4rem" }}>
                <div>
                  <h3 style={{ fontSize: "0.95rem", fontWeight: 700, margin: 0, color: "#111827" }}>
                    Funil do Processo de Acolhimento
                  </h3>
                  <span style={{ fontSize: "0.72rem", color: "#6b7280" }}>
                    Evolução da recepção à integração
                  </span>
                </div>
                <span style={{ fontSize: "0.72rem", fontWeight: 700, color: "#16a34a", background: "#f0fdf4", padding: "2px 8px", borderRadius: "999px" }}>
                  Conversão: {metrics.taxaIntegracao}%
                </span>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "0.65rem" }}>
                <FunnelStep
                  label="1. Novos Cadastros (Chegaram)"
                  count={metrics.total}
                  percent={metrics.total > 0 ? 100 : 0}
                  color="#2563eb"
                  badge={`${metrics.novos} novos`}
                />
                <FunnelStep
                  label="2. Contato Realizado (WhatsApp/Ligação)"
                  count={metrics.emContato + metrics.integrados}
                  percent={metrics.taxaContato}
                  color="#d97706"
                  badge={`${metrics.emContato} em andamento`}
                />
                <FunnelStep
                  label="3. Integrados (Célula/Ministério)"
                  count={metrics.integrados}
                  percent={metrics.taxaIntegracao}
                  color="#16a34a"
                  badge="Concluído"
                />
                {metrics.semResposta > 0 && (
                  <FunnelStep
                    label="Sem Resposta / Retentar"
                    count={metrics.semResposta}
                    percent={metrics.total > 0 ? Math.round((metrics.semResposta / metrics.total) * 100) : 0}
                    color="#9ca3af"
                  />
                )}
              </div>
            </div>

            {/* Grid 2 Colunas: Redes + Decisões */}
            <div className="dash-two-col">

              {/* Redes Ministeriais */}
              <div style={{ background: "white", borderRadius: "14px", padding: "1.15rem 1rem", boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
                <h3 style={{ fontSize: "0.95rem", fontWeight: 700, margin: "0 0 0.75rem 0", color: "#111827" }}>
                  Visitantes por Rede Ministerial
                </h3>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.65rem" }}>
                  {groups.map((g) => {
                    const stats = metrics.byGroup[g.name] || { total: 0, integrados: 0, novos: 0, emContato: 0 };
                    const styling = GROUP_COLORS[g.name] || { color: "#6b7280", bg: "#f3f4f6", title: g.description || "" };
                    const rate = stats.total > 0 ? Math.round((stats.integrados / stats.total) * 100) : 0;

                    return (
                      <div key={g.id} style={{ border: "1px solid #f0f0f0", borderRadius: "10px", padding: "0.75rem", background: "#fafafa" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.3rem" }}>
                          <div>
                            <span style={{
                              fontWeight: 800,
                              fontSize: "0.82rem",
                              color: styling.color,
                              background: styling.bg,
                              padding: "2px 6px",
                              borderRadius: "4px",
                            }}>
                              {g.name}
                            </span>
                            <span className="dash-hide-mobile" style={{ fontSize: "0.7rem", color: "#6b7280", marginLeft: "6px" }}>
                              {styling.title}
                            </span>
                          </div>
                          <div style={{ fontWeight: 800, fontSize: "0.9rem", color: "#111827" }}>
                            {stats.total} <span style={{ fontSize: "0.7rem", fontWeight: 400, color: "#6b7280" }}>visitantes</span>
                          </div>
                        </div>

                        {/* Barra de status visual */}
                        <div style={{ width: "100%", height: "6px", background: "#e5e7eb", borderRadius: "999px", overflow: "hidden", display: "flex", margin: "0.35rem 0" }}>
                          <div style={{ width: `${stats.total > 0 ? (stats.integrados / stats.total) * 100 : 0}%`, background: "#16a34a" }} />
                          <div style={{ width: `${stats.total > 0 ? (stats.emContato / stats.total) * 100 : 0}%`, background: "#d97706" }} />
                          <div style={{ width: `${stats.total > 0 ? (stats.novos / stats.total) * 100 : 0}%`, background: "#2563eb" }} />
                        </div>

                        {/* Mini grade de estatísticas limpa */}
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "4px", fontSize: "0.72rem", textAlign: "center", marginTop: "0.35rem" }}>
                          <div style={{ background: "#eff6ff", color: "#2563eb", padding: "3px 4px", borderRadius: "4px", fontWeight: 500 }}>
                            Novos: <strong>{stats.novos}</strong>
                          </div>
                          <div style={{ background: "#fffbeb", color: "#d97706", padding: "3px 4px", borderRadius: "4px", fontWeight: 500 }}>
                            Contato: <strong>{stats.emContato}</strong>
                          </div>
                          <div style={{ background: "#f0fdf4", color: "#16a34a", padding: "3px 4px", borderRadius: "4px", fontWeight: 500 }}>
                            Integrados: <strong>{stats.integrados}</strong> ({rate}%)
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Decisões de Fé & Estado Civil */}
              <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                {/* Decisões */}
                <div style={{ background: "white", borderRadius: "14px", padding: "1.15rem 1rem", boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
                  <h3 style={{ fontSize: "0.95rem", fontWeight: 700, margin: "0 0 0.75rem 0", color: "#111827" }}>
                    Decisões de Fé Registradas
                  </h3>
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.55rem" }}>
                    {Object.entries(DECISION_MAP).map(([key, label]) => {
                      const count = metrics.decisionsCount[key] || 0;
                      const pct = metrics.total > 0 ? Math.round((count / metrics.total) * 100) : 0;
                      return (
                        <div key={key}>
                          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.78rem", marginBottom: "0.2rem" }}>
                            <span style={{ fontWeight: 600, color: "#374151" }}>{label}</span>
                            <span style={{ fontWeight: 700, color: "#E8351A" }}>{count} ({pct}%)</span>
                          </div>
                          <div style={{ width: "100%", height: "5px", background: "#f3f4f6", borderRadius: "999px", overflow: "hidden" }}>
                            <div style={{ width: `${pct}%`, height: "100%", background: "#E8351A", borderRadius: "999px" }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Perfil por Estado Civil */}
                <div style={{ background: "white", borderRadius: "14px", padding: "1.15rem 1rem", boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
                  <h3 style={{ fontSize: "0.95rem", fontWeight: 700, margin: "0 0 0.75rem 0", color: "#111827" }}>
                    Perfil por Estado Civil
                  </h3>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(75px, 1fr))", gap: "0.4rem" }}>
                    {Object.entries(metrics.maritalCount).map(([status, count]) => (
                      <div key={status} style={{ background: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: "8px", padding: "0.4rem 0.3rem", textAlign: "center" }}>
                        <div style={{ fontSize: "0.62rem", color: "#6b7280", textTransform: "uppercase", fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                          {status}
                        </div>
                        <div style={{ fontSize: "1.05rem", fontWeight: 800, color: "#111827" }}>
                          {count}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

            </div>

          </div>
        )}

        {/* ══════════════════════════════════════════════════════════ */}
        {/* ABA 2: VISITANTES & EXPORTAÇÃO                           */}
        {/* ══════════════════════════════════════════════════════════ */}
        {activeTab === "visitors" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>

            {/* Banner Dinâmico de Link & QR Code */}
            <QrCodeSection compact onOpenModal={() => setShowQrModal(true)} />

            {/* Topo Filtros e Exportação */}
            <div style={{ background: "white", borderRadius: "14px", padding: "1.15rem 1rem", boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.65rem", marginBottom: "0.75rem" }}>
                <div>
                  <h2 style={{ fontSize: "1.15rem", fontWeight: 800, color: "#111827", margin: 0 }}>
                    {isMasterOrAdmin ? "Visitantes Cadastrados" : "Meus Visitantes"}
                  </h2>
                  <span style={{ fontSize: "0.72rem", color: "#6b7280" }}>
                    Mostrando <strong>{filteredVisitors.length}</strong> de <strong>{visitors.length}</strong> registros
                  </span>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", flexWrap: "wrap" }}>
                  {/* Alternador Tabela / Cards */}
                  <div style={{ background: "#f3f4f6", borderRadius: "8px", padding: "2px", display: "flex", gap: "2px" }}>
                    <button
                      id="view-mode-cards"
                      type="button"
                      onClick={() => setViewMode("cards")}
                      style={{
                        padding: "0.3rem 0.6rem",
                        border: "none",
                        borderRadius: "6px",
                        background: viewMode === "cards" ? "white" : "transparent",
                        fontWeight: viewMode === "cards" ? 700 : 500,
                        fontSize: "0.75rem",
                        cursor: "pointer",
                      }}
                    >
                      🗂️ Cards
                    </button>
                    <button
                      id="view-mode-table"
                      type="button"
                      onClick={() => setViewMode("table")}
                      style={{
                        padding: "0.3rem 0.6rem",
                        border: "none",
                        borderRadius: "6px",
                        background: viewMode === "table" ? "white" : "transparent",
                        fontWeight: viewMode === "table" ? 700 : 500,
                        fontSize: "0.75rem",
                        cursor: "pointer",
                      }}
                    >
                      📋 Tabela
                    </button>
                  </div>

                  {/* Exportação */}
                  {isMasterOrAdmin && (
                    <button
                      id="export-filtered-csv-btn"
                      onClick={() => exportToCSV(filteredVisitors, `visitantes_${new Date().toISOString().split("T")[0]}.csv`)}
                      style={{
                        background: "#E8351A",
                        color: "white",
                        border: "none",
                        borderRadius: "999px",
                        padding: "0.4rem 0.8rem",
                        fontSize: "0.75rem",
                        fontWeight: 600,
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: "0.3rem",
                      }}
                    >
                      <span>📥</span> Exportar CSV ({filteredVisitors.length})
                    </button>
                  )}
                </div>
              </div>

              {/* Filtros */}
              <div className="dash-filters-grid">
                <input
                  id="search-visitors"
                  placeholder="🔍 Buscar nome, fone, cidade..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  style={{
                    padding: "0.55rem 0.75rem",
                    border: "1.5px solid #e5e7eb",
                    borderRadius: "8px",
                    fontSize: "0.85rem",
                    outline: "none",
                    background: "#fafafa",
                    width: "100%",
                  }}
                />

                {groups.length > 1 && (
                  <select
                    id="filter-group"
                    value={filterGroup}
                    onChange={(e) => setFilterGroup(e.target.value)}
                    style={{
                      padding: "0.55rem 0.75rem",
                      border: "1.5px solid #e5e7eb",
                      borderRadius: "8px",
                      fontSize: "0.85rem",
                      background: "white",
                      cursor: "pointer",
                      width: "100%",
                    }}
                  >
                    <option value="ALL">Todas as Redes</option>
                    {groups.map((g) => (
                      <option key={g.id} value={g.name}>
                        {g.name} — {g.description}
                      </option>
                    ))}
                  </select>
                )}

                <select
                  id="filter-status"
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  style={{
                    padding: "0.55rem 0.75rem",
                    border: "1.5px solid #e5e7eb",
                    borderRadius: "8px",
                    fontSize: "0.85rem",
                    background: "white",
                    cursor: "pointer",
                    width: "100%",
                  }}
                >
                  <option value="ALL">Todos os Status</option>
                  {Object.entries(STATUS_LABELS).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v.label}
                    </option>
                  ))}
                </select>

                <select
                  id="filter-decision"
                  value={filterDecision}
                  onChange={(e) => setFilterDecision(e.target.value)}
                  style={{
                    padding: "0.55rem 0.75rem",
                    border: "1.5px solid #e5e7eb",
                    borderRadius: "8px",
                    fontSize: "0.85rem",
                    background: "white",
                    cursor: "pointer",
                    width: "100%",
                  }}
                >
                  <option value="ALL">Todas as Decisões</option>
                  {Object.entries(DECISION_MAP).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Lista Cards ou Tabela */}
            {filteredVisitors.length === 0 ? (
              <div style={{
                background: "white",
                borderRadius: "14px",
                padding: "2.5rem 1rem",
                textAlign: "center",
                color: "#9ca3af",
              }}>
                <div style={{ fontSize: "1.75rem", marginBottom: "0.3rem" }}>🔍</div>
                <div style={{ fontWeight: 600, fontSize: "0.95rem", color: "#374151" }}>Nenhum visitante encontrado</div>
                <p style={{ fontSize: "0.78rem", margin: "0.2rem 0 0 0" }}>Ajuste os filtros de busca acima.</p>
              </div>
            ) : viewMode === "cards" ? (
              /* ── MODO CARDS (OTIMIZADO MOBILE) ── */
              <div style={{ display: "flex", flexDirection: "column", gap: "0.65rem", width: "100%" }}>
                {filteredVisitors.map((v) => (
                  <VisitorCard
                    key={v.id}
                    visitor={v}
                    role={role}
                    onStatusChange={handleVisitorStatusChange}
                    onDelete={handleDeleteVisitor}
                  />
                ))}
              </div>
            ) : (
              /* ── MODO TABELA (SCROLL HORIZONTAL TOUCH) ── */
              <div style={{
                background: "white",
                borderRadius: "14px",
                overflow: "hidden",
                boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
                border: "1px solid #e5e7eb",
                width: "100%",
              }}>
                <div style={{
                  padding: "0.4rem 0.85rem",
                  background: "#f9fafb",
                  borderBottom: "1px solid #e5e7eb",
                  fontSize: "0.72rem",
                  color: "#6b7280",
                }}>
                  👉 Deslize horizontalmente para visualizar a tabela completa.
                </div>

                <div style={{ overflowX: "auto", width: "100%", WebkitOverflowScrolling: "touch" }}>
                  <table style={{ width: "100%", minWidth: "780px", borderCollapse: "collapse", textAlign: "left", fontSize: "0.82rem" }}>
                    <thead>
                      <tr style={{ background: "#f9fafb", borderBottom: "1.5px solid #e5e7eb", color: "#4b5563", fontWeight: 700, fontSize: "0.72rem", textTransform: "uppercase" }}>
                        <th style={{ padding: "0.75rem 0.85rem" }}>Visitante</th>
                        <th style={{ padding: "0.75rem 0.85rem" }}>Nasc. / Idade</th>
                        <th style={{ padding: "0.75rem 0.85rem" }}>Rede</th>
                        <th style={{ padding: "0.75rem 0.85rem" }}>Localização</th>
                        <th style={{ padding: "0.75rem 0.85rem" }}>Contato</th>
                        <th style={{ padding: "0.75rem 0.85rem" }}>Status</th>
                        <th style={{ padding: "0.75rem 0.85rem", textAlign: "right" }}>Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredVisitors.map((v, idx) => {
                        const grp = GROUP_COLORS[v.group?.name] || { color: "#6b7280", bg: "#f3f4f6" };
                        const st = STATUS_LABELS[v.status] || { label: v.status, color: "#6b7280", bg: "#f3f4f6" };
                        const isExpanded = expandedRowId === v.id;

                        return (
                          <Fragment key={v.id}>
                            <tr style={{ borderBottom: isExpanded ? "none" : "1px solid #f0f0f0", background: isExpanded ? "#fff7ed" : idx % 2 === 0 ? "white" : "#fafafa" }}>
                              <td style={{ padding: "0.75rem 0.85rem" }}>
                                <div style={{ fontWeight: 700, color: "#111827" }}>{v.fullName}</div>
                                <div style={{ fontSize: "0.68rem", color: "#6b7280" }}>
                                  {MARITAL_LABELS[v.maritalStatus] || v.maritalStatus} · {VISIT_REASON_LABELS[v.visitReason] || v.visitReason}
                                </div>
                              </td>

                              <td style={{ padding: "0.75rem 0.85rem" }}>
                                <div style={{ fontWeight: 600, color: "#111827" }}>{formatBirthDate(v.birthDate)}</div>
                                <div style={{ fontSize: "0.7rem", color: "#6b7280" }}>{v.calculatedAge} anos</div>
                              </td>

                              <td style={{ padding: "0.75rem 0.85rem" }}>
                                <span style={{ background: grp.bg, color: grp.color, fontWeight: 700, fontSize: "0.7rem", padding: "2px 6px", borderRadius: "4px" }}>
                                  {v.group?.name}
                                </span>
                              </td>

                              <td style={{ padding: "0.75rem 0.85rem" }}>
                                <div style={{ color: "#374151" }}>{v.city}</div>
                                <div style={{ fontSize: "0.7rem", color: "#6b7280" }}>{v.neighborhood}</div>
                              </td>

                              <td style={{ padding: "0.75rem 0.85rem", color: "#374151" }}>
                                {v.phone}
                              </td>

                              <td style={{ padding: "0.75rem 0.85rem" }}>
                                <select
                                  id={`table-status-${v.id}`}
                                  value={v.status}
                                  onChange={async (e) => {
                                    const newStatus = e.target.value;
                                    handleVisitorStatusChange(v.id, newStatus);
                                    await fetch(`/api/visitors/${v.id}`, {
                                      method: "PATCH",
                                      headers: { "Content-Type": "application/json" },
                                      body: JSON.stringify({ status: newStatus }),
                                    });
                                  }}
                                  style={{
                                    background: st.bg,
                                    color: st.color,
                                    border: `1.5px solid ${st.color}40`,
                                    borderRadius: "999px",
                                    padding: "2px 6px",
                                    fontSize: "0.72rem",
                                    fontWeight: 700,
                                    cursor: "pointer",
                                  }}
                                >
                                  {Object.entries(STATUS_LABELS).map(([k, s]) => (
                                    <option key={k} value={k}>
                                      {s.label}
                                    </option>
                                  ))}
                                </select>
                              </td>

                              <td style={{ padding: "0.75rem 0.85rem", textAlign: "right", whiteSpace: "nowrap" }}>
                                <div style={{ display: "inline-flex", alignItems: "center", gap: "0.35rem" }}>
                                  <button
                                    id={`table-view-btn-${v.id}`}
                                    type="button"
                                    onClick={() => setExpandedRowId(isExpanded ? null : v.id)}
                                    style={{
                                      background: isExpanded ? "#E8351A" : "#f3f4f6",
                                      color: isExpanded ? "white" : "#374151",
                                      border: "none",
                                      padding: "0.32rem 0.65rem",
                                      borderRadius: "999px",
                                      fontSize: "0.72rem",
                                      fontWeight: 700,
                                      cursor: "pointer",
                                    }}
                                  >
                                    {isExpanded ? "Fechar Ficha" : "📋 Ver Ficha"}
                                  </button>
                                  <a
                                    id={`table-wa-${v.id}`}
                                    href={whatsappUrl(v.phone, v.fullName, v.group?.whatsappTemplate, v.assignedLeader?.name)}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    style={{
                                      background: "#25D366",
                                      color: "white",
                                      padding: "0.32rem 0.65rem",
                                      borderRadius: "999px",
                                      fontSize: "0.72rem",
                                      fontWeight: 700,
                                      textDecoration: "none",
                                    }}
                                  >
                                    WhatsApp
                                  </a>
                                  <button
                                    id={`table-del-${v.id}`}
                                    type="button"
                                    onClick={() => handleDeleteVisitor(v.id, v.fullName)}
                                    title="Excluir cadastro"
                                    style={{
                                      background: "#fff1f0",
                                      color: "#E8351A",
                                      border: "1px solid #fecaca",
                                      padding: "0.32rem 0.55rem",
                                      borderRadius: "999px",
                                      fontSize: "0.72rem",
                                      fontWeight: 700,
                                      cursor: "pointer",
                                    }}
                                  >
                                    🗑️ Excluir
                                  </button>
                                </div>
                              </td>
                            </tr>

                            {isExpanded && (
                              <tr key={`${v.id}-details`} style={{ background: "#fcfcfc" }}>
                                <td colSpan={7} style={{ padding: "0.4rem 0.85rem 0.85rem 0.85rem", borderBottom: "2px solid #e5e7eb" }}>
                                  <div style={{ background: "white", borderRadius: "10px", border: "1.5px solid #e5e7eb", overflow: "hidden" }}>
                                    <div style={{ padding: "0.45rem 0.8rem", background: "#f9fafb", borderBottom: "1px solid #e5e7eb", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                      <span style={{ fontWeight: 800, fontSize: "0.78rem", color: "#111827" }}>
                                        📋 Ficha Completa do Formulário de Acolhimento — {v.fullName}
                                      </span>
                                      <button
                                        type="button"
                                        onClick={() => setExpandedRowId(null)}
                                        style={{ background: "none", border: "none", fontSize: "0.75rem", color: "#6b7280", cursor: "pointer", fontWeight: 600 }}
                                      >
                                        ✕ Fechar
                                      </button>
                                    </div>
                                    <VisitorDossier visitor={v} role={role} onStatusChange={handleVisitorStatusChange} onDelete={handleDeleteVisitor} />
                                  </div>
                                </td>
                              </tr>
                            )}
                          </Fragment>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

          </div>
        )}

        {/* ══════════════════════════════════════════════════════════ */}
        {/* ABA 3: REDES MINISTERIAIS (VISÃO EXECUTIVA MASTER)       */}
        {/* ══════════════════════════════════════════════════════════ */}
        {activeTab === "networks" && isMasterOrAdmin && (
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.5rem" }}>
              <div>
                <h2 style={{ fontSize: "1.2rem", fontWeight: 800, color: "#111827", margin: 0 }}>
                  Redes Ministeriais
                </h2>
                <p style={{ fontSize: "0.75rem", color: "#6b7280", margin: "2px 0 0 0" }}>
                  Frentes de acolhimento, mensagens e administradores/líderes vinculados.
                </p>
              </div>

              {isMasterOrAdmin && (
                <button
                  id="new-group-btn"
                  type="button"
                  onClick={() => setShowNewGroup(true)}
                  className="dash-mobile-full"
                  style={{
                    background: "#E8351A",
                    color: "white",
                    border: "none",
                    borderRadius: "999px",
                    padding: "0.5rem 1.15rem",
                    fontWeight: 600,
                    fontSize: "0.8rem",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "0.3rem",
                  }}
                >
                  + Nova Rede
                </button>
              )}
            </div>

            {showNewGroup && (
              <GroupEditForm
                allUsers={users}
                onCancel={() => setShowNewGroup(false)}
                onSaved={async () => {
                  setShowNewGroup(false);
                  await refreshGroups();
                  await refreshUsers();
                }}
                isNew
              />
            )}

            <div className="dash-networks-grid">
              {groups.map((g) => (
                <NetworkCard
                  key={g.id}
                  group={g}
                  visitors={visitors}
                  allUsers={users}
                  isMasterOrAdmin={isMasterOrAdmin}
                  onFilterGroup={(name) => {
                    setFilterGroup(name);
                    setActiveTab("visitors");
                  }}
                  onRefresh={async () => {
                    await refreshGroups();
                    await refreshUsers();
                  }}
                />
              ))}
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════ */}
        {/* ABA 4: GESTÃO DE USUÁRIOS (MASTER & ADMIN)                */}
        {/* ══════════════════════════════════════════════════════════ */}
        {activeTab === "users" && isMasterOrAdmin && (
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.5rem" }}>
              <div>
                <h2 style={{ fontSize: "1.2rem", fontWeight: 800, color: "#111827", margin: 0 }}>
                  Gestão de Acessos & Usuários
                </h2>
                <p style={{ fontSize: "0.75rem", color: "#6b7280", margin: "2px 0 0 0" }}>
                  Controle de usuários, senhas e redes vinculadas.
                </p>
              </div>

              <button
                id="new-user-btn"
                onClick={() => setShowNewUser(true)}
                className="dash-mobile-full"
                style={{
                  background: "#E8351A",
                  color: "white",
                  border: "none",
                  borderRadius: "999px",
                  padding: "0.5rem 1.15rem",
                  fontWeight: 600,
                  fontSize: "0.8rem",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "0.3rem",
                }}
              >
                + Novo Usuário
              </button>
            </div>

            {showNewUser && (
              <UserForm
                allGroups={groups}
                onCancel={() => setShowNewUser(false)}
                onSaved={async () => {
                  setShowNewUser(false);
                  await refreshUsers();
                  await refreshGroups();
                }}
                isNew
              />
            )}

            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              {users.map((u) => (
                <UserCard
                  key={u.id}
                  user={u}
                  allGroups={groups}
                  currentUserId={session.user.id}
                  onSaved={async () => {
                    await refreshUsers();
                    await refreshGroups();
                  }}
                />
              ))}
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════ */}
        {/* ABA 5: LINK & QR CODE DO FORMULÁRIO (TODOS OS ROLES)     */}
        {/* ══════════════════════════════════════════════════════════ */}
        {activeTab === "qrcode" && (
          <QrCodeSection />
        )}

      </main>

      {/* ── Barra de Navegação Inferior (Mobile App Style) ── */}
      <nav className="dash-bottom-nav">
        {isMasterOrAdmin && (
          <button
            type="button"
            onClick={() => setActiveTab("analytics")}
            className={`dash-bottom-btn ${activeTab === "analytics" ? "active" : ""}`}
          >
            <span className="dash-bottom-icon">📊</span>
            <span>Métricas</span>
          </button>
        )}

        <button
          type="button"
          onClick={() => setActiveTab("visitors")}
          className={`dash-bottom-btn ${activeTab === "visitors" ? "active" : ""}`}
        >
          <span className="dash-bottom-icon">
            👥
            {visitors.length > 0 && (
              <span className="dash-bottom-badge">{visitors.length}</span>
            )}
          </span>
          <span>Visitantes</span>
        </button>

        {isMasterOrAdmin && (
          <button
            type="button"
            onClick={() => setActiveTab("networks")}
            className={`dash-bottom-btn ${activeTab === "networks" ? "active" : ""}`}
          >
            <span className="dash-bottom-icon">🏛️</span>
            <span>Redes</span>
          </button>
        )}

        {isMasterOrAdmin && (
          <button
            type="button"
            onClick={() => setActiveTab("users")}
            className={`dash-bottom-btn ${activeTab === "users" ? "active" : ""}`}
          >
            <span className="dash-bottom-icon">⚙️</span>
            <span>Usuários</span>
          </button>
        )}

        <button
          type="button"
          onClick={() => setActiveTab("qrcode")}
          className={`dash-bottom-btn ${activeTab === "qrcode" ? "active" : ""}`}
        >
          <span className="dash-bottom-icon">📱</span>
          <span>QR Code</span>
        </button>
      </nav>

      {/* Modal Popup Rápido de QR Code */}
      <QrCodeModal isOpen={showQrModal} onClose={() => setShowQrModal(false)} />
    </div>
  );
}

// ── Componentes de UI Auxiliares ─────────────────────────

function TabButton({
  id,
  active,
  onClick,
  icon,
  label,
  count,
  badge,
}: {
  id: string;
  active: boolean;
  onClick: () => void;
  icon: string;
  label: string;
  count?: number;
  badge?: string;
}) {
  return (
    <button
      id={id}
      type="button"
      onClick={onClick}
      className={`dash-tab-btn ${active ? "active" : ""}`}
    >
      <span>{icon}</span>
      <span>{label}</span>
      {count !== undefined && (
        <span style={{
          background: active ? "#fff1f0" : "#e5e7eb",
          color: active ? "#E8351A" : "#4b5563",
          fontSize: "0.68rem",
          fontWeight: 700,
          borderRadius: "999px",
          padding: "1px 6px",
        }}>
          {count}
        </span>
      )}
      {badge && (
        <span style={{
          background: "#f0fdf4",
          color: "#16a34a",
          fontSize: "0.68rem",
          fontWeight: 700,
          borderRadius: "999px",
          padding: "1px 6px",
        }}>
          {badge}
        </span>
      )}
    </button>
  );
}

function KpiCard({
  title,
  value,
  subtitle,
  color,
  icon,
  highlight = false,
  isHero = false,
}: {
  title: string;
  value: string | number;
  subtitle: string;
  color: string;
  icon: string;
  highlight?: boolean;
  isHero?: boolean;
}) {
  return (
    <div style={{
      background: "white",
      borderRadius: "12px",
      padding: "0.85rem 1rem",
      boxShadow: highlight ? "0 2px 8px rgba(37,99,235,0.12)" : "0 1px 3px rgba(0,0,0,0.06)",
      border: highlight ? "1.5px solid #2563eb30" : "1px solid #f0f0f0",
      display: "flex",
      flexDirection: "column",
      justifyContent: "space-between",
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontSize: "0.7rem", fontWeight: 700, color: "#6b7280", textTransform: "uppercase" }}>
          {title}
        </span>
        <span style={{ fontSize: "1.05rem" }}>{icon}</span>
      </div>
      <div style={{ margin: "0.25rem 0" }}>
        <span style={{ fontSize: "1.6rem", fontWeight: 900, color, lineHeight: 1.1 }}>
          {value}
        </span>
      </div>
      <span style={{ fontSize: "0.7rem", color: "#9ca3af", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
        {subtitle}
      </span>
    </div>
  );
}

function FunnelStep({
  label,
  count,
  percent,
  color,
  badge,
}: {
  label: string;
  count: number;
  percent: number;
  color: string;
  badge?: string;
}) {
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.25rem", fontSize: "0.8rem" }}>
        <span style={{ fontWeight: 600, color: "#1f2937" }}>{label}</span>
        <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
          {badge && (
            <span style={{ fontSize: "0.68rem", fontWeight: 600, color, background: `${color}15`, padding: "1px 5px", borderRadius: "4px" }}>
              {badge}
            </span>
          )}
          <span style={{ fontWeight: 800, color: "#111827" }}>
            {count} ({percent}%)
          </span>
        </div>
      </div>
      <div style={{ width: "100%", height: "8px", background: "#f3f4f6", borderRadius: "999px", overflow: "hidden" }}>
        <div style={{ width: `${percent}%`, height: "100%", background: color, borderRadius: "999px" }} />
      </div>
    </div>
  );
}

// ── Card de Rede Ministerial (Master / Admin) ───────────────
function NetworkCard({
  group: g,
  visitors,
  allUsers,
  isMasterOrAdmin,
  onFilterGroup,
  onRefresh,
}: {
  group: Group;
  visitors: Visitor[];
  allUsers: User[];
  isMasterOrAdmin: boolean;
  onFilterGroup: (name: string) => void;
  onRefresh: () => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const styling = GROUP_COLORS[g.name] || { color: "#6b7280", bg: "#f3f4f6", title: g.description || "" };
  const netVisitors = visitors.filter((v) => v.group?.name === g.name);
  const integratedCount = netVisitors.filter((v) => v.status === "INTEGRADO").length;
  const newCount = netVisitors.filter((v) => v.status === "NOVO").length;
  const assignedLeaders = g.leaders || [];

  return (
    <div
      key={g.id}
      style={{
        background: "white",
        borderRadius: "14px",
        padding: "1.15rem 1rem",
        boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
        borderTop: `4px solid ${styling.color}`,
        display: "flex",
        flexDirection: "column",
        gap: "0.6rem",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "0.5rem" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
            <h3 style={{ fontSize: "1.15rem", fontWeight: 800, color: styling.color, margin: 0 }}>
              {g.name}
            </h3>
            {g.active === false && (
              <span style={{ fontSize: "0.62rem", background: "#fef2f2", color: "#ef4444", borderRadius: "4px", padding: "1px 5px", fontWeight: 700 }}>
                Inativa
              </span>
            )}
          </div>
          <div style={{ fontSize: "0.75rem", color: "#6b7280", marginTop: "2px" }}>
            {g.description || styling.title}
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
          <span style={{
            background: styling.bg,
            color: styling.color,
            fontWeight: 800,
            fontSize: "0.75rem",
            padding: "2px 8px",
            borderRadius: "999px",
            whiteSpace: "nowrap",
          }}>
            {netVisitors.length} visitantes
          </span>

          {isMasterOrAdmin && (
            <button
              id={`edit-group-${g.id}`}
              type="button"
              onClick={() => setEditing(!editing)}
              style={{
                background: editing ? "#f3f4f6" : "rgba(0,0,0,0.05)",
                border: "none",
                borderRadius: "6px",
                padding: "0.3rem 0.6rem",
                fontSize: "0.72rem",
                fontWeight: 600,
                color: "#374151",
                cursor: "pointer",
                whiteSpace: "nowrap",
              }}
            >
              {editing ? "Fechar" : "✏️ Editar"}
            </button>
          )}
        </div>
      </div>

      {editing ? (
        <GroupEditForm
          group={g}
          allUsers={allUsers}
          onCancel={() => setEditing(false)}
          onSaved={async () => {
            setEditing(false);
            await onRefresh();
          }}
        />
      ) : (
        <>
          {/* Mensagem WhatsApp configurada se houver */}
          {g.whatsappTemplate && (
            <div style={{
              background: "#f9fafb",
              border: "1px dashed #d1d5db",
              borderRadius: "8px",
              padding: "0.5rem 0.65rem",
              fontSize: "0.72rem",
              color: "#4b5563",
              lineHeight: 1.35,
            }}>
              <span style={{ fontWeight: 700, color: "#111827", display: "block", marginBottom: "2px" }}>
                💬 Template WhatsApp:
              </span>
              &ldquo;{g.whatsappTemplate}&rdquo;
            </div>
          )}

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem", margin: "0.25rem 0" }}>
            <div style={{ background: "#eff6ff", padding: "0.5rem", borderRadius: "8px", textAlign: "center" }}>
              <div style={{ fontSize: "0.68rem", color: "#2563eb", fontWeight: 600 }}>Novos</div>
              <div style={{ fontSize: "1.1rem", fontWeight: 800, color: "#2563eb" }}>{newCount}</div>
            </div>
            <div style={{ background: "#f0fdf4", padding: "0.5rem", borderRadius: "8px", textAlign: "center" }}>
              <div style={{ fontSize: "0.68rem", color: "#16a34a", fontWeight: 600 }}>Integrados</div>
              <div style={{ fontSize: "1.1rem", fontWeight: 800, color: "#16a34a" }}>{integratedCount}</div>
            </div>
          </div>

          {/* Líderes e Administradores Alocados */}
          <div style={{ borderTop: "1px solid #f0f0f0", paddingTop: "0.5rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.35rem" }}>
              <span style={{ fontSize: "0.7rem", fontWeight: 700, color: "#6b7280", textTransform: "uppercase" }}>
                Líderes Alocados ({assignedLeaders.length})
              </span>
              {isMasterOrAdmin && (
                <button
                  type="button"
                  onClick={() => setEditing(true)}
                  style={{
                    background: "none",
                    border: "none",
                    color: "#2563eb",
                    fontSize: "0.68rem",
                    fontWeight: 600,
                    cursor: "pointer",
                    padding: 0,
                  }}
                >
                  + Gerenciar
                </button>
              )}
            </div>
            {assignedLeaders.length === 0 ? (
              <div style={{ fontSize: "0.75rem", color: "#9ca3af", fontStyle: "italic" }}>
                Nenhum líder alocado nesta rede. Clique em &quot;Editar&quot; para vincular líderes.
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
                {assignedLeaders.map((l) => {
                  const roleB = ROLE_BADGES[l.user.role] || { label: l.user.role, color: "#fff", bg: "#6b7280" };
                  return (
                    <div key={l.user.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "0.75rem", background: "#f9fafb", padding: "0.3rem 0.5rem", borderRadius: "6px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
                        <span style={{ fontWeight: 600, color: "#111827" }}>{l.user.name}</span>
                        <span style={{ fontSize: "0.6rem", background: roleB.bg, color: roleB.color, borderRadius: "4px", padding: "1px 4px", fontWeight: 700 }}>
                          {roleB.label}
                        </span>
                      </div>
                      <span style={{ color: "#6b7280", fontSize: "0.7rem" }}>{l.user.phone || l.user.email}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <button
            id={`filter-net-${g.name}`}
            type="button"
            onClick={() => onFilterGroup(g.name)}
            style={{
              marginTop: "0.5rem",
              width: "100%",
              padding: "0.55rem",
              borderRadius: "8px",
              border: `1.5px solid ${styling.color}40`,
              background: styling.bg,
              color: styling.color,
              fontWeight: 700,
              fontSize: "0.75rem",
              cursor: "pointer",
            }}
          >
            Ver Visitantes da Rede {g.name} →
          </button>
        </>
      )}
    </div>
  );
}

// ── Formulário de Edição de Rede (Master / Admin) ────────────
function GroupEditForm({
  group,
  allUsers,
  onCancel,
  onSaved,
  isNew = false,
}: {
  group?: Group;
  allUsers: User[];
  onCancel: () => void;
  onSaved: () => Promise<void>;
  isNew?: boolean;
}) {
  const [name, setName] = useState(group?.name ?? "");
  const [description, setDescription] = useState(group?.description ?? "");
  const [whatsappTemplate, setWhatsappTemplate] = useState(
    group?.whatsappTemplate ??
      `Olá {nome}! Sou {lider} da rede ${group?.name || ""} da Igreja da Cidade Taubaté. Que alegria ter você conosco!`
  );
  const [active, setActive] = useState(group?.active ?? true);
  const initialLeaderIds = group?.leaders?.map((l) => l.user.id) ?? [];
  const [leaderUserIds, setLeaderUserIds] = useState<string[]>(initialLeaderIds);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [userSearch, setUserSearch] = useState("");

  const toggleLeader = (userId: string) => {
    setLeaderUserIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  const filteredUsers = useMemo(() => {
    if (!userSearch.trim()) return allUsers;
    const q = userSearch.toLowerCase();
    return allUsers.filter(
      (u) => u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)
    );
  }, [allUsers, userSearch]);

  async function handleSave() {
    setError("");
    if (!name.trim()) {
      setError("O nome da rede é obrigatório.");
      return;
    }
    setSaving(true);
    try {
      const body: any = {
        name: name.trim(),
        description: description.trim() || null,
        whatsappTemplate: whatsappTemplate.trim() || null,
        leaderUserIds,
      };
      if (!isNew) body.active = active;

      const url = isNew ? "/api/groups" : `/api/groups/${group!.id}`;
      const method = isNew ? "POST" : "PATCH";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error?.message || data.error || "Erro ao salvar a rede.");
        return;
      }

      await onSaved();
    } catch {
      setError("Erro de conexão ao salvar.");
    } finally {
      setSaving(false);
    }
  }

  const inputStyle = {
    padding: "0.55rem 0.75rem",
    border: "1.5px solid #e5e7eb",
    borderRadius: "8px",
    fontSize: "0.82rem",
    background: "white",
    outline: "none",
    width: "100%",
    boxSizing: "border-box" as const,
  };

  return (
    <div style={{
      background: "#fcfcfc",
      border: "1.5px solid #e5e7eb",
      borderRadius: "10px",
      padding: "0.9rem",
      display: "flex",
      flexDirection: "column",
      gap: "0.75rem",
    }}>
      <div style={{ fontWeight: 800, fontSize: "0.9rem", color: "#111827", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span>{isNew ? "Criar Nova Rede Ministerial" : `Editar Rede: ${group?.name}`}</span>
        {!isNew && (
          <label style={{ display: "flex", alignItems: "center", gap: "0.35rem", cursor: "pointer", fontSize: "0.75rem", fontWeight: 600 }}>
            <input
              id={`toggle-group-active-${group?.id}`}
              type="checkbox"
              checked={active}
              onChange={(e) => setActive(e.target.checked)}
              style={{ accentColor: "#E8351A" }}
            />
            {active ? "Ativa" : "Inativa"}
          </label>
        )}
      </div>

      {error && (
        <div style={{ background: "#fff1f0", border: "1.5px solid #E8351A", borderRadius: "6px", padding: "0.4rem 0.6rem", fontSize: "0.75rem", color: "#E8351A", fontWeight: 600 }}>
          {error}
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
        <label style={{ fontSize: "0.7rem", fontWeight: 700, color: "#6b7280", textTransform: "uppercase" }}>
          Nome da Rede
        </label>
        <input
          id="group-name-input"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Ex: VOLTZ, BOLD, BURN..."
          style={inputStyle}
        />
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
        <label style={{ fontSize: "0.7rem", fontWeight: 700, color: "#6b7280", textTransform: "uppercase" }}>
          Descrição / Faixa Etária
        </label>
        <input
          id="group-desc-input"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Ex: Jovens Adultos (27 a 35 anos)"
          style={inputStyle}
        />
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <label style={{ fontSize: "0.7rem", fontWeight: 700, color: "#6b7280", textTransform: "uppercase" }}>
            Template Mensagem WhatsApp
          </label>
          <span style={{ fontSize: "0.68rem", color: "#9ca3af" }}>
            Tags: <code>{"{nome}"}</code> e <code>{"{lider}"}</code>
          </span>
        </div>
        <textarea
          id="group-wa-input"
          rows={3}
          value={whatsappTemplate}
          onChange={(e) => setWhatsappTemplate(e.target.value)}
          placeholder="Olá {nome}! Sou {lider} da equipe..."
          style={{ ...inputStyle, resize: "vertical", fontFamily: "inherit" }}
        />
      </div>

      {/* Seletor de Líderes e Administradores */}
      <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.3rem" }}>
          <label style={{ fontSize: "0.7rem", fontWeight: 700, color: "#6b7280", textTransform: "uppercase" }}>
            Líderes e Administradores Alocados ({leaderUserIds.length} selecionados)
          </label>
          {allUsers.length > 4 && (
            <input
              type="text"
              placeholder="🔍 Filtrar..."
              value={userSearch}
              onChange={(e) => setUserSearch(e.target.value)}
              style={{ padding: "0.2rem 0.5rem", fontSize: "0.7rem", border: "1px solid #e5e7eb", borderRadius: "4px" }}
            />
          )}
        </div>

        <div style={{
          maxHeight: "150px",
          overflowY: "auto",
          background: "white",
          border: "1px solid #e5e7eb",
          borderRadius: "8px",
          padding: "0.4rem",
          display: "flex",
          flexDirection: "column",
          gap: "0.25rem",
        }}>
          {filteredUsers.length === 0 ? (
            <div style={{ fontSize: "0.72rem", color: "#9ca3af", padding: "0.3rem" }}>
              Nenhum usuário cadastrado encontrado.
            </div>
          ) : (
            filteredUsers.map((u) => {
              const selected = leaderUserIds.includes(u.id);
              const roleB = ROLE_BADGES[u.role] || { label: u.role, color: "#fff", bg: "#6b7280" };
              return (
                <button
                  key={u.id}
                  id={`toggle-group-leader-${u.id}`}
                  type="button"
                  onClick={() => toggleLeader(u.id)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "0.35rem 0.5rem",
                    borderRadius: "6px",
                    border: `1.5px solid ${selected ? "#E8351A" : "transparent"}`,
                    background: selected ? "#fff1f0" : "#f9fafb",
                    cursor: "pointer",
                    textAlign: "left",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                    <span style={{ fontSize: "0.85rem", color: selected ? "#E8351A" : "#9ca3af", fontWeight: 700 }}>
                      {selected ? "☑" : "☐"}
                    </span>
                    <span style={{ fontSize: "0.75rem", fontWeight: selected ? 700 : 500, color: "#111827" }}>
                      {u.name}
                    </span>
                    <span style={{ fontSize: "0.6rem", background: roleB.bg, color: roleB.color, borderRadius: "3px", padding: "1px 4px", fontWeight: 700 }}>
                      {roleB.label}
                    </span>
                  </div>
                  <span style={{ fontSize: "0.68rem", color: "#6b7280" }}>{u.email}</span>
                </button>
              );
            })
          )}
        </div>
      </div>

      <div style={{ display: "flex", gap: "0.4rem", justifyContent: "flex-end", marginTop: "0.2rem" }}>
        <button
          type="button"
          onClick={onCancel}
          disabled={saving}
          style={{
            padding: "0.45rem 0.85rem",
            background: "transparent",
            border: "1.5px solid #e5e7eb",
            borderRadius: "999px",
            fontSize: "0.75rem",
            fontWeight: 600,
            color: "#6b7280",
            cursor: "pointer",
          }}
        >
          Cancelar
        </button>
        <button
          id="save-group-btn"
          type="button"
          onClick={handleSave}
          disabled={saving}
          style={{
            padding: "0.45rem 1.1rem",
            background: "#E8351A",
            border: "none",
            borderRadius: "999px",
            fontSize: "0.75rem",
            fontWeight: 700,
            color: "white",
            cursor: saving ? "not-allowed" : "pointer",
            opacity: saving ? 0.7 : 1,
          }}
        >
          {saving ? "Salvando..." : "Salvar Alterações"}
        </button>
      </div>
    </div>
  );
}

// ── Card de Usuário (Admin) ──────────────────────────────
function UserCard({
  user,
  allGroups,
  currentUserId,
  onSaved,
}: {
  user: User;
  allGroups: Group[];
  currentUserId: string;
  onSaved: () => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const isSelf = user.id === currentUserId;
  const userGroupIds = user.leaderGroups?.map((lg) => lg.groupId) ?? [];
  const roleInfo = ROLE_BADGES[user.role] || { label: user.role, color: "#fff", bg: "#6b7280" };

  return (
    <div style={{
      background: "white",
      borderRadius: "12px",
      overflow: "hidden",
      boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
      borderLeft: `4px solid ${roleInfo.bg}`,
    }}>
      <div style={{ padding: "0.85rem 1rem", display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap" }}>
        <div style={{
          width: "2.3rem",
          height: "2.3rem",
          borderRadius: "50%",
          background: roleInfo.bg,
          color: "white",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontWeight: 800,
          fontSize: "0.9rem",
          flexShrink: 0,
        }}>
          {user.name.charAt(0).toUpperCase()}
        </div>

        <div style={{ flex: 1, minWidth: "160px" }}>
          <div style={{ fontWeight: 700, fontSize: "0.9rem", display: "flex", alignItems: "center", gap: "0.4rem" }}>
            {user.name}
            {!user.active && (
              <span style={{ fontSize: "0.62rem", background: "#fef2f2", color: "#ef4444", borderRadius: "4px", padding: "1px 5px", fontWeight: 700 }}>
                Inativo
              </span>
            )}
          </div>
          <div style={{ fontSize: "0.72rem", color: "#6b7280", display: "flex", gap: "0.4rem", flexWrap: "wrap", marginTop: "2px" }}>
            <span>{user.email}</span>
            {user.phone && <span>· {user.phone}</span>}
          </div>

          {user.leaderGroups && user.leaderGroups.length > 0 && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.25rem", marginTop: "0.3rem" }}>
              {user.leaderGroups.map((lg) => {
                const grpStyle = GROUP_COLORS[lg.group.name] || { color: "#6b7280", bg: "#f3f4f6" };
                return (
                  <span key={lg.groupId} style={{
                    fontSize: "0.65rem",
                    fontWeight: 700,
                    background: grpStyle.bg,
                    color: grpStyle.color,
                    borderRadius: "4px",
                    padding: "1px 5px",
                  }}>
                    {lg.group.name}
                  </span>
                );
              })}
            </div>
          )}
        </div>

        <span style={{
          background: roleInfo.bg,
          color: roleInfo.color,
          borderRadius: "999px",
          padding: "2px 8px",
          fontSize: "0.68rem",
          fontWeight: 700,
          flexShrink: 0,
        }}>
          {roleInfo.label}
        </span>

        <button
          id={`edit-user-${user.id}`}
          onClick={() => setEditing(!editing)}
          style={{
            background: editing ? "#f0f0f0" : "#f5f5f5",
            border: "none",
            borderRadius: "6px",
            padding: "0.35rem 0.75rem",
            fontSize: "0.75rem",
            fontWeight: 600,
            cursor: "pointer",
            color: "#374151",
            flexShrink: 0,
          }}
        >
          {editing ? "Fechar" : "Editar"}
        </button>
      </div>

      {editing && (
        <div style={{ borderTop: "1px solid #f0f0f0" }}>
          <UserForm
            user={user}
            allGroups={allGroups}
            currentGroupIds={userGroupIds}
            isSelf={isSelf}
            onCancel={() => setEditing(false)}
            onSaved={async () => {
              setEditing(false);
              await onSaved();
            }}
          />
        </div>
      )}
    </div>
  );
}

// ── Formulário Usuário (Admin) ────────────────────────────
function UserForm({
  user,
  allGroups,
  currentGroupIds = [],
  isSelf = false,
  isNew = false,
  onCancel,
  onSaved,
}: {
  user?: User;
  allGroups: Group[];
  currentGroupIds?: string[];
  isSelf?: boolean;
  isNew?: boolean;
  onCancel: () => void;
  onSaved: () => Promise<void>;
}) {
  const [name, setName] = useState(user?.name ?? "");
  const [email, setEmail] = useState(user?.email ?? "");
  const [phone, setPhone] = useState(user?.phone ?? "");
  const [role, setRole] = useState(user?.role ?? "LEADER");
  const [active, setActive] = useState(user?.active ?? true);
  const [password, setPassword] = useState("");
  const [groupIds, setGroupIds] = useState<string[]>(currentGroupIds);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const toggleGroup = (id: string) => {
    setGroupIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  async function handleSave() {
    setError("");
    if (!name.trim() || !email.trim()) {
      setError("Nome e e-mail são obrigatórios.");
      return;
    }
    if (isNew && !password) {
      setError("Defina uma senha para o novo usuário.");
      return;
    }

    setSaving(true);
    try {
      const body: any = {
        name,
        email,
        phone: phone.trim() || null,
        role,
        groupIds,
      };
      if (!isNew) body.active = active;
      if (password) body.password = password;

      const url = isNew ? "/api/users" : `/api/users/${user!.id}`;
      const method = isNew ? "POST" : "PATCH";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? "Erro ao salvar.");
        return;
      }
      await onSaved();
    } catch {
      setError("Erro de conexão ao salvar.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDeactivate() {
    if (!user || isSelf) return;
    if (!confirm(`Tem certeza que deseja desativar o usuário "${user.name}"?`)) return;
    setSaving(true);
    await fetch(`/api/users/${user.id}`, { method: "DELETE" });
    await onSaved();
  }

  const field = (label: string, node: React.ReactNode) => (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
      <label style={{ fontSize: "0.7rem", fontWeight: 700, color: "#6b7280", textTransform: "uppercase" }}>
        {label}
      </label>
      {node}
    </div>
  );

  const inputStyle = {
    padding: "0.6rem 0.75rem",
    border: "1.5px solid #e5e7eb",
    borderRadius: "8px",
    fontSize: "0.85rem",
    background: "white",
    outline: "none",
    width: "100%",
  };

  return (
    <div style={{ padding: "1rem", display: "flex", flexDirection: "column", gap: "0.85rem", background: "#fcfcfc" }}>
      {error && (
        <div style={{ background: "#fff1f0", border: "1.5px solid #E8351A", borderRadius: "8px", padding: "0.5rem", fontSize: "0.75rem", color: "#E8351A", fontWeight: 600 }}>
          {error}
        </div>
      )}

      <div className="dash-form-grid">
        {field("Nome Completo", <input id="edit-name" value={name} onChange={(e) => setName(e.target.value)} style={inputStyle} placeholder="Nome" />)}
        {field("Usuário / E-mail", <input id="edit-email" type="text" value={email} onChange={(e) => setEmail(e.target.value)} style={inputStyle} placeholder="ex: admin, voltz ou email" />)}
        {field("Telefone", <input id="edit-phone" value={phone} maxLength={15} onChange={(e) => {
          const f = formatPhoneInput(e.target.value);
          setPhone(f);
          if (e.target.value !== f) e.target.value = f;
        }} style={inputStyle} placeholder="(12) 9XXXX-XXXX" />)}
        {field("Role",
          <select id="edit-role" value={role} onChange={(e) => setRole(e.target.value)} style={{ ...inputStyle, cursor: "pointer" }}>
            <option value="LEADER">Líder</option>
            <option value="MASTER">Master</option>
            <option value="ADMIN">Admin</option>
          </select>
        )}
        {field("Senha" + (isNew ? "" : " (em branco p/ manter)"),
          <input id="edit-password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} style={inputStyle} placeholder={isNew ? "Mínimo 6 dígitos" : "••••••••"} />
        )}
      </div>

      {field("Redes Vinculadas",
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem" }}>
          {allGroups.map((g) => {
            const checked = groupIds.includes(g.id);
            const grpStyle = GROUP_COLORS[g.name] || { color: "#6b7280" };
            return (
              <button
                key={g.id}
                id={`group-toggle-${g.id}`}
                type="button"
                onClick={() => toggleGroup(g.id)}
                style={{
                  padding: "0.35rem 0.75rem",
                  border: `2px solid ${checked ? grpStyle.color : "#e5e7eb"}`,
                  borderRadius: "999px",
                  background: checked ? `${grpStyle.color}15` : "white",
                  color: checked ? grpStyle.color : "#6b7280",
                  fontSize: "0.75rem",
                  fontWeight: checked ? 700 : 500,
                  cursor: "pointer",
                }}
              >
                {checked ? `✓ ${g.name}` : g.name}
              </button>
            );
          })}
        </div>
      )}

      {!isNew && !isSelf && field("Status da Conta",
        <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", cursor: "pointer" }}>
          <input id="edit-active" type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} style={{ width: "1rem", height: "1rem", accentColor: "#E8351A" }} />
          <span style={{ fontSize: "0.8rem", fontWeight: 600 }}>Usuário ativo no sistema</span>
        </label>
      )}

      <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", justifyContent: "space-between", marginTop: "0.4rem" }}>
        <div style={{ display: "flex", gap: "0.4rem" }}>
          <button
            id="save-user-btn"
            onClick={handleSave}
            disabled={saving}
            style={{
              background: "#E8351A",
              color: "white",
              border: "none",
              borderRadius: "999px",
              padding: "0.5rem 1rem",
              fontWeight: 600,
              fontSize: "0.8rem",
              cursor: saving ? "not-allowed" : "pointer",
              opacity: saving ? 0.7 : 1,
            }}
          >
            {saving ? "Salvando..." : isNew ? "Cadastrar" : "Salvar"}
          </button>
          <button
            id="cancel-edit-btn"
            onClick={onCancel}
            disabled={saving}
            style={{
              background: "transparent",
              color: "#6b7280",
              border: "1.5px solid #e5e7eb",
              borderRadius: "999px",
              padding: "0.5rem 0.85rem",
              fontSize: "0.8rem",
              cursor: "pointer",
            }}
          >
            Cancelar
          </button>
        </div>

        {!isNew && !isSelf && (
          <button
            id="deactivate-user-btn"
            onClick={handleDeactivate}
            disabled={saving}
            style={{
              background: "transparent",
              color: user?.active ? "#ef4444" : "#9ca3af",
              border: "1.5px solid #fee2e2",
              borderRadius: "999px",
              padding: "0.5rem 0.75rem",
              fontSize: "0.75rem",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            {user?.active ? "Desativar" : "Inativo"}
          </button>
        )}
      </div>
    </div>
  );
}

// ── Ficha Completa do Visitante (Visualização Detalhada para Líderes e Master) ──
function VisitorDossier({
  visitor: v,
  role,
  onStatusChange,
  onDelete,
}: {
  visitor: Visitor;
  role: string;
  onStatusChange: (id: string, newStatus: string) => void;
  onDelete?: (id: string, name: string) => void;
}) {
  const [updating, setUpdating] = useState(false);
  const decisions = (() => {
    try {
      return JSON.parse(v.decisions || "[]") as string[];
    } catch {
      return [];
    }
  })();

  async function handleStatusUpdate(newStatus: string) {
    if (newStatus === v.status || updating) return;
    setUpdating(true);
    try {
      const res = await fetch(`/api/visitors/${v.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        onStatusChange(v.id, newStatus);
      }
    } catch (e) {
      console.error("Erro ao atualizar status:", e);
    } finally {
      setUpdating(false);
    }
  }

  return (
    <div style={{ padding: "0.95rem 1rem", display: "flex", flexDirection: "column", gap: "0.85rem", background: "#fcfcfc" }}>
      {/* ── 1. Identificação & Dados Pessoais ── */}
      <div>
        <div style={{ fontSize: "0.68rem", fontWeight: 800, color: "#4b5563", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: "0.35rem", display: "flex", alignItems: "center", gap: "0.3rem" }}>
          <span>👤</span> Identificação & Dados Pessoais
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: "0.5rem", background: "white", padding: "0.75rem", borderRadius: "10px", border: "1px solid #e5e7eb" }}>
          <Info label="Nome Completo" value={v.fullName} />
          <Info label="Data de Nascimento" value={formatBirthDate(v.birthDate)} />
          <Info label="Idade Calculada" value={`${v.calculatedAge} anos`} />
          <Info label="Estado Civil" value={MARITAL_LABELS[v.maritalStatus] || v.maritalStatus} />
        </div>
      </div>

      {/* ── 2. Localização & Contato ── */}
      <div>
        <div style={{ fontSize: "0.68rem", fontWeight: 800, color: "#4b5563", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: "0.35rem", display: "flex", alignItems: "center", gap: "0.3rem" }}>
          <span>📍</span> Endereço & Contato
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: "0.5rem", background: "white", padding: "0.75rem", borderRadius: "10px", border: "1px solid #e5e7eb" }}>
          <Info label="WhatsApp / Telefone" value={v.phone} />
          <Info label="Cidade" value={v.city} />
          <Info label="Bairro" value={v.neighborhood} />
        </div>
      </div>

      {/* ── 3. Vida Espiritual & Visita ── */}
      <div>
        <div style={{ fontSize: "0.68rem", fontWeight: 800, color: "#4b5563", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: "0.35rem", display: "flex", alignItems: "center", gap: "0.3rem" }}>
          <span>🕊️</span> Visita & Decisões de Fé
        </div>
        <div style={{ background: "white", padding: "0.75rem", borderRadius: "10px", border: "1px solid #e5e7eb", display: "flex", flexDirection: "column", gap: "0.6rem" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: "0.5rem" }}>
            <Info label="Motivo da Visita" value={VISIT_REASON_LABELS[v.visitReason] || v.visitReason} />
            <Info label="Rede Ministerial" value={`${v.group?.name} (${v.group?.description || ""})`} />
            <Info label="Data do Cadastro" value={formatDate(v.createdAt)} />
            {v.assignedLeader && <Info label="Líder Designado" value={v.assignedLeader.name} />}
          </div>

          <div style={{ borderTop: "1px dashed #e5e7eb", paddingTop: "0.5rem" }}>
            <div style={{ fontSize: "0.65rem", fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", marginBottom: "0.3rem" }}>
              Decisões de Fé Registradas no Formulário
            </div>
            {decisions.length === 0 ? (
              <span style={{ fontSize: "0.75rem", color: "#9ca3af", fontStyle: "italic" }}>
                Nenhuma decisão específica assinalada (Visita geral).
              </span>
            ) : (
              <div style={{ display: "flex", flexWrap: "wrap", gap: "0.35rem" }}>
                {decisions.map((d) => (
                  <span
                    key={d}
                    style={{
                      background: "#fff1f0",
                      color: "#E8351A",
                      border: "1px solid #E8351A40",
                      borderRadius: "999px",
                      padding: "3px 10px",
                      fontSize: "0.72rem",
                      fontWeight: 700,
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "0.25rem",
                    }}
                  >
                    <span>✨</span> {DECISION_MAP[d] || d}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── 4. Gestão do Acolhimento ── */}
      <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
        <div style={{ fontSize: "0.68rem", fontWeight: 800, color: "#4b5563", textTransform: "uppercase", letterSpacing: "0.04em" }}>
          ⚡ Mudar Status do Acolhimento:
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.35rem" }}>
          {Object.entries(STATUS_LABELS).map(([k, s]) => {
            const isCurrent = v.status === k;
            return (
              <button
                key={k}
                id={`status-${v.id}-${k}`}
                type="button"
                disabled={isCurrent || updating}
                onClick={() => handleStatusUpdate(k)}
                style={{
                  padding: "0.35rem 0.75rem",
                  borderRadius: "999px",
                  fontSize: "0.72rem",
                  fontWeight: isCurrent ? 700 : 500,
                  border: `1.5px solid ${isCurrent ? s.color : "#e5e7eb"}`,
                  background: isCurrent ? s.bg : "white",
                  color: isCurrent ? s.color : "#6b7280",
                  cursor: isCurrent ? "default" : "pointer",
                  opacity: updating ? 0.6 : 1,
                }}
              >
                {isCurrent ? `✓ ${s.label}` : s.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── 5. Botão de Contato WhatsApp ── */}
      <div style={{ marginTop: "0.15rem" }}>
        <a
          id={`whatsapp-${v.id}`}
          href={whatsappUrl(v.phone, v.fullName, v.group?.whatsappTemplate, v.assignedLeader?.name)}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "0.4rem",
            background: "#25D366",
            color: "white",
            padding: "0.65rem 1.15rem",
            borderRadius: "999px",
            fontSize: "0.82rem",
            fontWeight: 700,
            textDecoration: "none",
            boxShadow: "0 2px 6px rgba(37,211,102,0.3)",
            width: "100%",
            boxSizing: "border-box",
          }}
        >
          💬 Chamar no WhatsApp com Mensagem Personalizada
        </a>
        {onDelete && (
          <button
            id={`dossier-del-${v.id}`}
            type="button"
            onClick={() => onDelete(v.id, v.fullName)}
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "0.4rem",
              background: "#fff1f0",
              color: "#E8351A",
              border: "1.5px solid #fecaca",
              padding: "0.55rem 1.15rem",
              borderRadius: "999px",
              fontSize: "0.8rem",
              fontWeight: 700,
              cursor: "pointer",
              width: "100%",
              boxSizing: "border-box",
              marginTop: "0.5rem",
            }}
          >
            🗑️ Excluir este cadastro
          </button>
        )}
      </div>
    </div>
  );
}

// ── Card de Visitante (Mobile First) ─────────────────────
function VisitorCard({
  visitor: v,
  role,
  onStatusChange,
  onDelete,
}: {
  visitor: Visitor;
  role: string;
  onStatusChange: (id: string, newStatus: string) => void;
  onDelete?: (id: string, name: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const status = STATUS_LABELS[v.status] ?? { label: v.status, color: "#9ca3af", bg: "#f3f4f6" };
  const grpStyle = GROUP_COLORS[v.group?.name] ?? { color: "#6b7280", bg: "#f3f4f6" };

  return (
    <div style={{
      background: "white",
      borderRadius: "12px",
      boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
      overflow: "hidden",
      borderLeft: `4px solid ${grpStyle.color}`,
      width: "100%",
    }}>
      <button
        id={`visitor-card-${v.id}`}
        onClick={() => setExpanded(!expanded)}
        style={{
          width: "100%",
          background: "none",
          border: "none",
          padding: "0.85rem 1rem",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          gap: "0.65rem",
          textAlign: "left",
        }}
      >
        <div style={{
          width: "2.2rem",
          height: "2.2rem",
          borderRadius: "50%",
          background: grpStyle.color,
          color: "white",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontWeight: 800,
          fontSize: "0.85rem",
          flexShrink: 0,
        }}>
          {v.fullName.charAt(0).toUpperCase()}
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: "0.9rem", color: "#111827", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {v.fullName}
          </div>
          <div style={{ fontSize: "0.72rem", color: "#6b7280" }}>
            {v.calculatedAge} anos ({formatBirthDate(v.birthDate)}) · {v.neighborhood ? `${v.neighborhood}, ` : ""}{v.city} · <strong>{v.group?.name}</strong>
          </div>
        </div>

        <span style={{
          fontSize: "0.68rem",
          fontWeight: 700,
          color: status.color,
          background: status.bg,
          padding: "2px 8px",
          borderRadius: "999px",
          border: `1px solid ${status.color}30`,
          whiteSpace: "nowrap",
          flexShrink: 0,
        }}>
          {status.label}
        </span>

        <span style={{ color: "#9ca3af", fontSize: "0.75rem", flexShrink: 0 }}>
          {expanded ? "▲" : "▼"}
        </span>
      </button>

      {expanded && (
        <div style={{ borderTop: "1px solid #f0f0f0" }}>
          <VisitorDossier visitor={v} role={role} onStatusChange={onStatusChange} onDelete={onDelete} />
        </div>
      )}
    </div>
  );
}

function Info({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <div style={{ fontSize: "0.65rem", fontWeight: 700, color: "#9ca3af", textTransform: "uppercase" }}>
        {label}
      </div>
      <div style={{ fontWeight: 600, color: "#111827", marginTop: "1px", fontSize: "0.78rem" }}>
        {value || "Não informado"}
      </div>
    </div>
  );
}
