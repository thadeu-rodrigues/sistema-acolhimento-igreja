"use client";

import { useState, useMemo, Fragment } from "react";

// ── Tipos ────────────────────────────────────────────────
export type Visitor = {
  id: string;
  fullName: string;
  phone: string;
  city: string;
  neighborhood: string;
  maritalStatus: string;
  hasChildren?: boolean;
  childrenCount?: number | null;
  birthDate?: string;
  calculatedAge: number;
  visitReason: string;
  decisions: string | null;
  status: string;
  createdAt: string;
  group: { id: string; name: string; description: string | null; whatsappTemplate?: string | null };
  assignedLeader: { name: string } | null;
};

export type Group = {
  id: string;
  name: string;
  description: string | null;
  whatsappTemplate?: string | null;
  active?: boolean;
};

type DatePreset = "ALL" | "TODAY" | "7DAYS" | "30DAYS" | "THIS_MONTH" | "CUSTOM";
type Granularity = "DAILY" | "WEEKLY" | "MONTHLY" | "YEARLY";

interface Props {
  visitors: Visitor[];
  groups: Group[];
  role: string;
  exportToCSV: (visitors: Visitor[], filename: string) => void;
}

// ── Constantes & Metadados do Novo Formulário ─────────────
const GROUP_COLORS: Record<string, { color: string; bg: string; title: string }> = {
  VOLTZ:   { color: "#7c3aed", bg: "#f5f3ff", title: "Adolescentes (até 17 anos)" },
  BOLD:    { color: "#E8351A", bg: "#fff1f0", title: "Jovens (18 a 26 anos)" },
  BURN:    { color: "#ea580c", bg: "#fff7ed", title: "Adultos (27+ anos)" },
  A3:      { color: "#0891b2", bg: "#ecfeff", title: "Casais & Família" },
};

// 3 Decisões Oficiais sob "Tomei uma decisão"
const DECISION_META: Record<string, { label: string; color: string; icon: string }> = {
  ACEITAR_JESUS: { label: "1 — Aceitar Jesus", color: "#E8351A", icon: "✨" },
  RECONCILIACAO: { label: "2 — Reconciliação", color: "#d97706", icon: "🕊️" },
  BATISMO:       { label: "3 — Batismo",       color: "#2563eb", icon: "💧" },
};

// 4 Motivos da Visita Oficiais
const REASON_META: Record<string, { label: string; color: string; icon: string }> = {
  QUERO_GDC:    { label: "Quero um GDC",      color: "#16a34a", icon: "🤝" },
  PRIMEIRA_VEZ: { label: "Primeira Vez",      color: "#2563eb", icon: "👋" },
  EVANGELISMO:  { label: "Evangelismo",       color: "#7c3aed", icon: "📖" },
  DECISAO:      { label: "Tomei uma Decisão", color: "#E8351A", icon: "✝️" },
};

const MARITAL_LABELS: Record<string, string> = {
  SOLTEIRO:   "Solteiro(a)",
  CASADO:     "Casado(a)",
  NOIVO:      "Noivo(a)",
  DIVORCIADO: "Divorciado(a)",
  VIUVO:      "Viúvo(a)",
};

function getMotivoWhatsAppText(visitReason?: string, decisions?: string | null): string {
  if (visitReason === "PRIMEIRA_VEZ") {
    return "Vi aqui que você teve contato pela primeira vez com a nossa igreja!";
  }
  if (visitReason === "QUERO_GDC") {
    return "Vi que você gostaria de conhecer um grupo da cidade!";
  }
  if (visitReason === "EVANGELISMO") {
    return "Vi que você conversou com a nossa equipe em uma ação de evangelismo!";
  }
  if (visitReason === "DECISAO" || (decisions && decisions !== "[]")) {
    let decs: string[] = [];
    try {
      decs = JSON.parse(decisions || "[]") as string[];
    } catch {}

    const hasAceitar = decs.includes("ACEITAR_JESUS");
    const hasRecon = decs.includes("RECONCILIACAO");
    const hasBatismo = decs.includes("BATISMO");

    if (hasAceitar && hasBatismo) {
      return "Vi aqui que você tomou a decisão de aceitar a Jesus e também pelo batismo!";
    }
    if (hasRecon && hasBatismo) {
      return "Vi aqui que você tomou a decisão de se reconciliar com Jesus e também pelo batismo!";
    }
    if (hasAceitar) {
      return "Vi aqui que você tomou a decisão de aceitar a Jesus!";
    }
    if (hasRecon) {
      return "Vi aqui que você tomou a decisão de se reconciliar com Jesus!";
    }
    if (hasBatismo) {
      return "Vi aqui que você tomou a decisão pelo batismo!";
    }
    return "Vi aqui que você tomou uma decisão de fé!";
  }

  return "Vi aqui que você teve contato pela primeira vez com a nossa igreja!";
}

function whatsappUrl(
  phone: string,
  name: string,
  template?: string | null,
  leaderName?: string,
  visitReason?: string,
  decisions?: string | null
) {
  const digits = phone.replace(/\D/g, "");
  const firstName = name.trim().split(" ")[0];
  const motivoText = getMotivoWhatsAppText(visitReason, decisions);

  let text = template;
  if (text) {
    text = text
      .replace(/\{nome\}/gi, firstName)
      .replace(/\{lider\}/gi, leaderName || "da equipe de acolhimento")
      .replace(/\{motivo\}|\{\*1\*\}|\{decisao\}/gi, motivoText);

    if (text.includes("da rede") && !template?.includes("{motivo}")) {
      text = `Olá ${firstName}! Sou da equipe de acolhimento da Igreja da Cidade em Taubaté! Como você está? ${motivoText} Gostaria de ter mais informações?`;
    }
  } else {
    text = `Olá ${firstName}! Sou da equipe de acolhimento da Igreja da Cidade em Taubaté! Como você está? ${motivoText} Gostaria de ter mais informações?`;
  }

  return `https://wa.me/55${digits}?text=${encodeURIComponent(text)}`;
}

function formatDateTime(isoString: string): string {
  try {
    const d = new Date(isoString);
    return d.toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return isoString;
  }
}

export default function AnalyticsDashboard({ visitors, groups, role, exportToCSV }: Props) {
  // ── Estados de Filtro de Datas ──
  const [datePreset, setDatePreset] = useState<DatePreset>("ALL");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [groupFilter, setGroupFilter] = useState("ALL");
  const [granularity, setGranularity] = useState<Granularity>("DAILY");
  const [chartMode, setChartMode] = useState<"DECISIONS" | "VOLUME">("DECISIONS");
  const [hoveredPointIndex, setHoveredPointIndex] = useState<number | null>(null);

  // ── Filtragem de Visitantes pelo Período & Rede ──
  const filteredVisitors = useMemo(() => {
    const now = new Date();

    return visitors.filter((v) => {
      // Filtro de Grupo
      if (groupFilter !== "ALL" && v.group?.name !== groupFilter) {
        return false;
      }

      // Filtro de Data
      if (datePreset === "ALL") return true;

      const vDate = new Date(v.createdAt);
      if (isNaN(vDate.getTime())) return true;

      if (datePreset === "TODAY") {
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
        return vDate >= todayStart;
      }
      if (datePreset === "7DAYS") {
        const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        return vDate >= sevenDaysAgo;
      }
      if (datePreset === "30DAYS") {
        const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        return vDate >= thirtyDaysAgo;
      }
      if (datePreset === "THIS_MONTH") {
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);
        return vDate >= startOfMonth;
      }
      if (datePreset === "CUSTOM") {
        if (customStart) {
          const start = new Date(customStart + "T00:00:00");
          if (vDate < start) return false;
        }
        if (customEnd) {
          const end = new Date(customEnd + "T23:59:59");
          if (vDate > end) return false;
        }
        return true;
      }

      return true;
    });
  }, [visitors, datePreset, customStart, customEnd, groupFilter]);

  // ── Cálculos de Métricas no Período ──
  const metrics = useMemo(() => {
    const total = filteredVisitors.length;
    const novos = filteredVisitors.filter((v) => v.status === "NOVO").length;
    const emContato = filteredVisitors.filter((v) => v.status === "EM_CONTATO").length;
    const integrados = filteredVisitors.filter((v) => v.status === "INTEGRADO").length;
    const semResposta = filteredVisitors.filter((v) => v.status === "SEM_RESPOSTA").length;
    const taxaIntegracao = total > 0 ? Math.round((integrados / total) * 100) : 0;
    const taxaContato = total > 0 ? Math.round(((emContato + integrados) / total) * 100) : 0;

    // Idade
    const validAges = filteredVisitors.map((v) => v.calculatedAge).filter((a) => a > 0);
    const mediaIdade =
      validAges.length > 0 ? Math.round((validAges.reduce((a, b) => a + b, 0) / validAges.length) * 10) / 10 : 0;

    // Faixas Etárias
    const ageBrackets = {
      ate17:  filteredVisitors.filter((v) => v.calculatedAge <= 17).length,
      d18a26: filteredVisitors.filter((v) => v.calculatedAge >= 18 && v.calculatedAge <= 26).length,
      d27a35: filteredVisitors.filter((v) => v.calculatedAge >= 27 && v.calculatedAge <= 35).length,
      d36a49: filteredVisitors.filter((v) => v.calculatedAge >= 36 && v.calculatedAge <= 49).length,
      d50mais: filteredVisitors.filter((v) => v.calculatedAge >= 50).length,
    };

    // Redes
    const byGroup: Record<string, { total: number; integrados: number; novos: number; emContato: number }> = {};
    groups.forEach((g) => {
      byGroup[g.name] = { total: 0, integrados: 0, novos: 0, emContato: 0 };
    });
    filteredVisitors.forEach((v) => {
      const gName = v.group?.name || "OUTROS";
      if (!byGroup[gName]) {
        byGroup[gName] = { total: 0, integrados: 0, novos: 0, emContato: 0 };
      }
      byGroup[gName].total += 1;
      if (v.status === "INTEGRADO") byGroup[gName].integrados += 1;
      if (v.status === "NOVO") byGroup[gName].novos += 1;
      if (v.status === "EM_CONTATO") byGroup[gName].emContato += 1;
    });

    // Decisões de Fé (Apenas as 3 oficiais)
    const decisionsCount: Record<string, number> = {
      ACEITAR_JESUS: 0,
      RECONCILIACAO: 0,
      BATISMO: 0,
    };
    let totalDecisions = 0;
    filteredVisitors.forEach((v) => {
      try {
        const arr = JSON.parse(v.decisions || "[]") as string[];
        let hasDec = false;
        arr.forEach((d) => {
          if (decisionsCount[d] !== undefined) {
            decisionsCount[d] += 1;
            hasDec = true;
          }
        });
        if (hasDec || v.visitReason === "DECISAO") {
          totalDecisions += 1;
        }
      } catch {}
    });

    // Motivos da Visita (4 oficiais)
    const reasonsCount: Record<string, number> = {
      QUERO_GDC: 0,
      PRIMEIRA_VEZ: 0,
      EVANGELISMO: 0,
      DECISAO: 0,
    };
    filteredVisitors.forEach((v) => {
      if (reasonsCount[v.visitReason] !== undefined) {
        reasonsCount[v.visitReason] += 1;
      } else {
        reasonsCount.PRIMEIRA_VEZ += 1;
      }
    });

    // Filhos & Família
    const withChildren = filteredVisitors.filter((v) => v.hasChildren).length;
    const withoutChildren = filteredVisitors.filter((v) => !v.hasChildren).length;
    const totalChildren = filteredVisitors.reduce(
      (acc, v) => acc + (v.hasChildren ? (v.childrenCount || 1) : 0),
      0
    );
    const mediaFilhos = withChildren > 0 ? (totalChildren / withChildren).toFixed(1) : "0";

    // Estado Civil
    const maritalCount: Record<string, number> = {};
    filteredVisitors.forEach((v) => {
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
      mediaIdade,
      ageBrackets,
      byGroup,
      totalDecisions,
      decisionsCount,
      reasonsCount,
      withChildren,
      withoutChildren,
      totalChildren,
      mediaFilhos,
      maritalCount,
    };
  }, [filteredVisitors, groups]);

  // ── Agrupamento Temporal com Granularidade (Diário, Semanal, Mensal, Anual) ──
  const timelineData = useMemo(() => {
    if (filteredVisitors.length === 0) return [];

    const pad = (n: number) => String(n).padStart(2, "0");
    const monthNames = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
    const weekdays = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

    const map = new Map<
      string,
      {
        key: string;
        label: string;
        fullLabel: string;
        visitors: number;
        primeiraVez: number;
        decisions: number;
        aceitarJesus: number;
        reconciliacao: number;
        batismo: number;
      }
    >();

    // Ordenar cronologicamente
    const sorted = [...filteredVisitors].sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );

    sorted.forEach((v) => {
      const d = new Date(v.createdAt);
      if (isNaN(d.getTime())) return;

      let key = "";
      let label = "";
      let fullLabel = "";

      if (granularity === "DAILY") {
        key = d.toISOString().split("T")[0];
        const weekday = weekdays[d.getDay()];
        label = `${pad(d.getDate())}/${pad(d.getMonth() + 1)} (${weekday})`;
        fullLabel = d.toLocaleDateString("pt-BR", {
          weekday: "long",
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
        });
      } else if (granularity === "WEEKLY") {
        const dayOfWeek = d.getDay();
        const distToMon = (dayOfWeek + 6) % 7;
        const mon = new Date(d);
        mon.setDate(d.getDate() - distToMon);
        const sun = new Date(mon);
        sun.setDate(mon.getDate() + 6);

        key = mon.toISOString().split("T")[0];
        label = `${pad(mon.getDate())}/${pad(mon.getMonth() + 1)}`;
        fullLabel = `Semana: ${pad(mon.getDate())}/${pad(mon.getMonth() + 1)} a ${pad(sun.getDate())}/${pad(sun.getMonth() + 1)}/${sun.getFullYear()}`;
      } else if (granularity === "MONTHLY") {
        key = `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
        label = `${monthNames[d.getMonth()]}/${String(d.getFullYear()).slice(-2)}`;
        fullLabel = `${monthNames[d.getMonth()]} de ${d.getFullYear()}`;
      } else if (granularity === "YEARLY") {
        key = String(d.getFullYear());
        label = String(d.getFullYear());
        fullLabel = `Ano ${d.getFullYear()}`;
      }

      const current = map.get(key) || {
        key,
        label,
        fullLabel,
        visitors: 0,
        primeiraVez: 0,
        decisions: 0,
        aceitarJesus: 0,
        reconciliacao: 0,
        batismo: 0,
      };

      current.visitors += 1;
      if (v.visitReason === "PRIMEIRA_VEZ") {
        current.primeiraVez += 1;
      }

      try {
        const decs = JSON.parse(v.decisions || "[]") as string[];
        let hasSpecific = false;
        if (decs.includes("ACEITAR_JESUS")) {
          current.aceitarJesus += 1;
          hasSpecific = true;
        }
        if (decs.includes("RECONCILIACAO")) {
          current.reconciliacao += 1;
          hasSpecific = true;
        }
        if (decs.includes("BATISMO")) {
          current.batismo += 1;
          hasSpecific = true;
        }

        if (hasSpecific || v.visitReason === "DECISAO") {
          current.decisions += 1;
          if (!hasSpecific) {
            current.aceitarJesus += 1;
          }
        }
      } catch {}

      map.set(key, current);
    });

    return Array.from(map.values());
  }, [filteredVisitors, granularity]);

  // Texto do Período Ativo
  const activePeriodLabel = useMemo(() => {
    switch (datePreset) {
      case "TODAY":
        return "Hoje";
      case "7DAYS":
        return "Últimos 7 dias";
      case "30DAYS":
        return "Últimos 30 dias";
      case "THIS_MONTH":
        return "Este mês";
      case "CUSTOM":
        return customStart && customEnd ? `${customStart} até ${customEnd}` : "Período personalizado";
      case "ALL":
      default:
        return "Todo o histórico";
    }
  }, [datePreset, customStart, customEnd]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.1rem" }}>
      {/* ── Topo: Título & Exportação ── */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.6rem" }}>
        <div>
          <h1 style={{ fontSize: "1.25rem", fontWeight: 800, color: "#111827", margin: 0 }}>
            {role === "LEADER"
              ? `Painel de Contatos & Retornos: Rede ${groups.map((g) => g.name).join(", ")}`
              : "Painel Executivo de Métricas"}
          </h1>
          <p style={{ fontSize: "0.75rem", color: "#6b7280", margin: "2px 0 0 0" }}>
            {role === "LEADER"
              ? `Quantificação de contatos recebidos, acompanhamento dos retornos e resolução de pendências.`
              : "Acompanhamento em tempo real sincronizado ao banco PostgreSQL."}
          </p>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <button
            id="export-metrics-csv-btn"
            onClick={() => exportToCSV(filteredVisitors, `metricas_periodo_${datePreset.toLowerCase()}.csv`)}
            style={{
              background: "#0A0A0A",
              color: "white",
              border: "none",
              borderRadius: "999px",
              padding: "0.45rem 1rem",
              fontWeight: 600,
              fontSize: "0.78rem",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "0.4rem",
              boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
            }}
          >
            <span>📥</span> Exportar Período ({filteredVisitors.length})
          </button>
        </div>
      </div>

      {/* ── BARRA DE CONTROLE: FILTRO DE DATAS & PERÍODOS ── */}
      <div
        style={{
          background: "white",
          borderRadius: "14px",
          padding: "1rem",
          boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
          border: "1px solid #e5e7eb",
          display: "flex",
          flexDirection: "column",
          gap: "0.85rem",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.5rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.45rem" }}>
            <span style={{ fontSize: "0.95rem" }}>📅</span>
            <span style={{ fontSize: "0.8rem", fontWeight: 700, color: "#1f2937", textTransform: "uppercase", letterSpacing: "0.03em" }}>
              Período de Análise:
            </span>
            <span style={{
              background: "#eff6ff",
              color: "#2563eb",
              borderRadius: "999px",
              padding: "2px 8px",
              fontSize: "0.72rem",
              fontWeight: 700,
            }}>
              {activePeriodLabel}
            </span>
          </div>

          {/* Filtro de Rede (Para Admin permite escolher, para Líder fica travado na sua rede) */}
          {role === "LEADER" ? (
            <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
              <span style={{ fontSize: "0.75rem", color: "#6b7280", fontWeight: 600 }}>Ministério:</span>
              <span style={{
                fontSize: "0.75rem",
                fontWeight: 800,
                color: "#E8351A",
                background: "#fff1f0",
                padding: "2px 8px",
                borderRadius: "6px",
                border: "1px solid #fecaca",
              }}>
                Rede {groups.map((g) => g.name).join(", ")}
              </span>
            </div>
          ) : (
            <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
              <span style={{ fontSize: "0.75rem", color: "#6b7280", fontWeight: 600 }}>Rede:</span>
              <select
                value={groupFilter}
                onChange={(e) => setGroupFilter(e.target.value)}
                style={{
                  fontSize: "0.78rem",
                  padding: "0.3rem 0.6rem",
                  borderRadius: "6px",
                  border: "1px solid #d1d5db",
                  background: "#f9fafb",
                  fontWeight: 600,
                  color: "#374151",
                  cursor: "pointer",
                }}
              >
                <option value="ALL">Todas as Redes</option>
                {groups.map((g) => (
                  <option key={g.id} value={g.name}>
                    {g.name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Chips de Presets de Data */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem", alignItems: "center" }}>
          {[
            { id: "ALL", label: "Todo o Histórico" },
            { id: "TODAY", label: "Hoje" },
            { id: "7DAYS", label: "Últimos 7 dias" },
            { id: "30DAYS", label: "Últimos 30 dias" },
            { id: "THIS_MONTH", label: "Este Mês" },
            { id: "CUSTOM", label: "🗓️ Personalizado" },
          ].map((preset) => {
            const isSelected = datePreset === preset.id;
            return (
              <button
                key={preset.id}
                type="button"
                onClick={() => setDatePreset(preset.id as DatePreset)}
                style={{
                  background: isSelected ? "#E8351A" : "#f3f4f6",
                  color: isSelected ? "white" : "#374151",
                  border: isSelected ? "1px solid #E8351A" : "1px solid #e5e7eb",
                  borderRadius: "999px",
                  padding: "0.35rem 0.85rem",
                  fontSize: "0.75rem",
                  fontWeight: isSelected ? 700 : 500,
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                }}
              >
                {preset.label}
              </button>
            );
          })}
        </div>

        {/* Inputs de Data Personalizada (Se "CUSTOM" estiver ativo) */}
        {datePreset === "CUSTOM" && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.6rem",
              background: "#fafafa",
              padding: "0.65rem 0.85rem",
              borderRadius: "8px",
              border: "1px dashed #d1d5db",
              flexWrap: "wrap",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
              <label style={{ fontSize: "0.75rem", fontWeight: 600, color: "#4b5563" }}>De:</label>
              <input
                type="date"
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
                style={{
                  fontSize: "0.78rem",
                  padding: "0.3rem 0.5rem",
                  borderRadius: "6px",
                  border: "1px solid #d1d5db",
                  background: "white",
                }}
              />
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
              <label style={{ fontSize: "0.75rem", fontWeight: 600, color: "#4b5563" }}>Até:</label>
              <input
                type="date"
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
                style={{
                  fontSize: "0.78rem",
                  padding: "0.3rem 0.5rem",
                  borderRadius: "6px",
                  border: "1px solid #d1d5db",
                  background: "white",
                }}
              />
            </div>

            {(customStart || customEnd) && (
              <button
                type="button"
                onClick={() => {
                  setCustomStart("");
                  setCustomEnd("");
                }}
                style={{
                  background: "none",
                  border: "none",
                  color: "#E8351A",
                  fontSize: "0.72rem",
                  fontWeight: 600,
                  cursor: "pointer",
                  textDecoration: "underline",
                }}
              >
                Limpar datas
              </button>
            )}
          </div>
        )}

        {/* Indicador de Quantidade Filtrada */}
        <div style={{ fontSize: "0.72rem", color: "#6b7280" }}>
          Exibindo <strong>{metrics.total}</strong> {metrics.total === 1 ? "cadastro" : "cadastros"} neste recorte ({metrics.reasonsCount.PRIMEIRA_VEZ} de primeira vez).
        </div>
      </div>

      {role === "LEADER" ? (
        <LeaderDashboardView
          metrics={metrics}
          filteredVisitors={filteredVisitors}
          groups={groups}
          timelineData={timelineData}
          granularity={granularity}
          hoveredPointIndex={hoveredPointIndex}
          setHoveredPointIndex={setHoveredPointIndex}
        />
      ) : (
        <>
          {/* ── KPI CARDS ADMIN ── */}
          <div className="dash-kpi-grid">
            <KpiCard title="Total Cadastros" value={metrics.total} subtitle="Fichas no período" color="#0A0A0A" icon="📋" />
            <KpiCard title="Visitantes (1ª Vez)" value={metrics.reasonsCount.PRIMEIRA_VEZ} subtitle="Pela primeira vez na igreja" color="#2563eb" icon="👋" highlight={metrics.reasonsCount.PRIMEIRA_VEZ > 0} />
            <KpiCard title="Decisões de Fé" value={metrics.totalDecisions} subtitle={`${metrics.decisionsCount.ACEITAR_JESUS} Aceitar | ${metrics.decisionsCount.RECONCILIACAO} Recon. | ${metrics.decisionsCount.BATISMO} Bat.`} color="#E8351A" icon="✝️" highlight={metrics.totalDecisions > 0} />
            <KpiCard title="Quero um GDC" value={metrics.reasonsCount.QUERO_GDC} subtitle="Busca por célula" color="#059669" icon="👥" />
            <KpiCard title="Taxa Integração" value={`${metrics.taxaIntegracao}%`} subtitle={`${metrics.taxaContato}% contato iniciado`} color="#7c3aed" icon="📈" isHero />
          </div>

      {/* ── GRÁFICO: EVOLUÇÃO E COMPARATIVO DE DECISÕES ── */}
      <div
        style={{
          background: "white",
          borderRadius: "14px",
          padding: "1.2rem",
          boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
          border: "1px solid #e5e7eb",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.85rem", flexWrap: "wrap", gap: "0.6rem" }}>
          <div>
            <h3 style={{ fontSize: "0.95rem", fontWeight: 800, margin: 0, color: "#111827", display: "flex", alignItems: "center", gap: "0.4rem" }}>
              <span>{chartMode === "DECISIONS" ? "✝️ Comparativo Diário de Decisões de Fé" : "📈 Gráfico de Evolução Geral"}</span>
            </h3>
            <span style={{ fontSize: "0.72rem", color: "#6b7280" }}>
              {chartMode === "DECISIONS"
                ? "Compare as decisões de cada dia divididas por: Aceitar Jesus, Reconciliação e Batismo"
                : "Acompanhamento do volume total de cadastros e decisões ao longo do tempo"}
            </span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", flexWrap: "wrap" }}>
            {/* Seletor de Modo do Gráfico */}
            <div style={{ display: "flex", background: "#f3f4f6", padding: "2px", borderRadius: "8px", gap: "2px" }}>
              <button
                id="chart-mode-decisions-btn"
                type="button"
                onClick={() => setChartMode("DECISIONS")}
                style={{
                  background: chartMode === "DECISIONS" ? "white" : "transparent",
                  color: chartMode === "DECISIONS" ? "#E8351A" : "#6b7280",
                  fontWeight: chartMode === "DECISIONS" ? 800 : 500,
                  fontSize: "0.72rem",
                  padding: "0.25rem 0.65rem",
                  border: "none",
                  borderRadius: "6px",
                  cursor: "pointer",
                  boxShadow: chartMode === "DECISIONS" ? "0 1px 2px rgba(0,0,0,0.08)" : "none",
                  transition: "all 0.15s ease",
                }}
              >
                ✝️ Decisões por Dia
              </button>
              <button
                id="chart-mode-volume-btn"
                type="button"
                onClick={() => setChartMode("VOLUME")}
                style={{
                  background: chartMode === "VOLUME" ? "white" : "transparent",
                  color: chartMode === "VOLUME" ? "#E8351A" : "#6b7280",
                  fontWeight: chartMode === "VOLUME" ? 800 : 500,
                  fontSize: "0.72rem",
                  padding: "0.25rem 0.65rem",
                  border: "none",
                  borderRadius: "6px",
                  cursor: "pointer",
                  boxShadow: chartMode === "VOLUME" ? "0 1px 2px rgba(0,0,0,0.08)" : "none",
                  transition: "all 0.15s ease",
                }}
              >
                📊 Volume Geral
              </button>
            </div>

            {/* Granularidade */}
            <div style={{ display: "flex", background: "#f3f4f6", padding: "2px", borderRadius: "8px", gap: "2px" }}>
              {[
                { id: "DAILY", label: "Diário" },
                { id: "WEEKLY", label: "Semanal" },
                { id: "MONTHLY", label: "Mensal" },
                { id: "YEARLY", label: "Anual" },
              ].map((g) => (
                <button
                  key={g.id}
                  id={`filter-granularity-${g.id.toLowerCase()}`}
                  type="button"
                  onClick={() => setGranularity(g.id as Granularity)}
                  style={{
                    background: granularity === g.id ? "white" : "transparent",
                    color: granularity === g.id ? "#111827" : "#6b7280",
                    fontWeight: granularity === g.id ? 800 : 500,
                    fontSize: "0.72rem",
                    padding: "0.25rem 0.55rem",
                    border: "none",
                    borderRadius: "6px",
                    cursor: "pointer",
                    boxShadow: granularity === g.id ? "0 1px 2px rgba(0,0,0,0.08)" : "none",
                    transition: "all 0.15s ease",
                  }}
                >
                  {g.label}
                </button>
              ))}
            </div>

            {/* Legenda Dinâmica de Acordo com o Modo */}
            {chartMode === "DECISIONS" ? (
              <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", fontSize: "0.72rem", flexWrap: "wrap" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}>
                  <span style={{ width: "9px", height: "9px", background: "#E8351A", borderRadius: "2px" }} />
                  <span style={{ fontWeight: 600, color: "#374151" }}>Aceitar Jesus</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}>
                  <span style={{ width: "9px", height: "9px", background: "#F59E0B", borderRadius: "2px" }} />
                  <span style={{ fontWeight: 600, color: "#374151" }}>Reconciliação</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}>
                  <span style={{ width: "9px", height: "9px", background: "#0284C7", borderRadius: "2px" }} />
                  <span style={{ fontWeight: 600, color: "#374151" }}>Batismo</span>
                </div>
              </div>
            ) : (
              <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", fontSize: "0.72rem" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}>
                  <span style={{ width: "9px", height: "9px", background: "#E8351A", borderRadius: "2px" }} />
                  <span style={{ fontWeight: 600, color: "#374151" }}>Cadastros</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}>
                  <span style={{ width: "9px", height: "9px", background: "#F59E0B", borderRadius: "2px" }} />
                  <span style={{ fontWeight: 600, color: "#374151" }}>Decisões</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Banner de Resumo Rápido das Decisões */}
        {chartMode === "DECISIONS" && (
          <div
            style={{
              background: "#fafafa",
              border: "1px solid #f0f0f0",
              borderRadius: "10px",
              padding: "0.5rem 0.85rem",
              marginBottom: "1rem",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: "0.5rem",
              fontSize: "0.75rem",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", fontWeight: 700, color: "#111827" }}>
              <span>✝️ Total no período selecionado:</span>
              <span style={{ background: "#E8351A", color: "white", padding: "1px 7px", borderRadius: "999px", fontSize: "0.72rem", fontWeight: 800 }}>
                {metrics.totalDecisions} {metrics.totalDecisions === 1 ? "decisão" : "decisões"}
              </span>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "0.85rem", flexWrap: "wrap" }}>
              <span style={{ color: "#E8351A", fontWeight: 700 }}>
                ✨ {metrics.decisionsCount.ACEITAR_JESUS} Aceitaram Jesus
              </span>
              <span style={{ color: "#d97706", fontWeight: 700 }}>
                🕊️ {metrics.decisionsCount.RECONCILIACAO} Reconciliação
              </span>
              <span style={{ color: "#0284c7", fontWeight: 700 }}>
                💧 {metrics.decisionsCount.BATISMO} Batismo
              </span>
            </div>
          </div>
        )}

        {timelineData.length === 0 ? (
          <div style={{ padding: "3rem 1rem", textAlign: "center", color: "#9ca3af" }}>
            <div style={{ fontSize: "1.8rem" }}>📉</div>
            <div style={{ fontWeight: 600, fontSize: "0.9rem", color: "#4b5563", marginTop: "0.4rem" }}>
              Nenhum dado temporal no período selecionado
            </div>
            <p style={{ fontSize: "0.75rem", margin: "2px 0 0 0" }}>Tente ampliar o filtro de datas acima.</p>
          </div>
        ) : (
          <TimelineChart
            data={timelineData}
            granularity={granularity}
            chartMode={chartMode}
            hoveredIndex={hoveredPointIndex}
            onHover={setHoveredPointIndex}
          />
        )}
      </div>

      {/* ── GRID 2 COLUNAS: MOTIVOS DA VISITA & DECISÕES DE FÉ ── */}
      <div className="dash-two-col">

        {/* ── CARD 1: MOTIVOS DA VISITA (NOVO FORMATO DO FORMULÁRIO) ── */}
        <div
          style={{
            background: "white",
            borderRadius: "14px",
            padding: "1.2rem",
            boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
            border: "1px solid #e5e7eb",
          }}
        >
          <div style={{ marginBottom: "0.85rem" }}>
            <h3 style={{ fontSize: "0.95rem", fontWeight: 800, margin: 0, color: "#111827" }}>
              🧭 Motivos da Visita
            </h3>
            <span style={{ fontSize: "0.72rem", color: "#6b7280" }}>
              Os 4 motivos oficiais cadastrados no formulário de acolhimento
            </span>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "0.55rem" }}>
            {Object.entries(REASON_META).map(([key, meta]) => {
              const count = metrics.reasonsCount[key] || 0;
              const pct = metrics.total > 0 ? Math.round((count / metrics.total) * 100) : 0;
              return (
                <div
                  key={key}
                  style={{
                    background: "#f9fafb",
                    border: "1px solid #f0f0f0",
                    borderRadius: "10px",
                    padding: "0.7rem 0.85rem",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.35rem" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.45rem" }}>
                      <span style={{ fontSize: "1.1rem" }}>{meta.icon}</span>
                      <span style={{ fontWeight: 700, fontSize: "0.82rem", color: "#111827" }}>
                        {meta.label}
                      </span>
                    </div>

                    <div style={{ textAlign: "right" }}>
                      <span style={{ fontWeight: 800, fontSize: "0.95rem", color: meta.color }}>
                        {count}
                      </span>
                      <span style={{ fontSize: "0.7rem", color: "#6b7280", marginLeft: "4px" }}>
                        ({pct}%)
                      </span>
                    </div>
                  </div>

                  <div style={{ width: "100%", height: "6px", background: "#e5e7eb", borderRadius: "999px", overflow: "hidden" }}>
                    <div
                      style={{
                        width: `${pct}%`,
                        height: "100%",
                        background: meta.color,
                        borderRadius: "999px",
                        transition: "width 0.4s ease",
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── CARD 2: DECISÕES DE FÉ (NOVO FORMATO DO FORMULÁRIO) ── */}
        <div
          style={{
            background: "white",
            borderRadius: "14px",
            padding: "1.2rem",
            boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
            border: "1px solid #e5e7eb",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.85rem" }}>
            <div>
              <h3 style={{ fontSize: "0.95rem", fontWeight: 800, margin: 0, color: "#111827" }}>
                ✝️ Decisões de Fé Registradas
              </h3>
              <span style={{ fontSize: "0.72rem", color: "#6b7280" }}>
                Passos de fé assinalados na opção &quot;Tomei uma Decisão&quot;
              </span>
            </div>
            <span style={{
              background: "#fff1f0",
              color: "#E8351A",
              fontWeight: 700,
              fontSize: "0.72rem",
              padding: "2px 8px",
              borderRadius: "999px",
              border: "1px solid #fecaca",
            }}>
              {metrics.totalDecisions} {metrics.totalDecisions === 1 ? "decisão" : "decisões"}
            </span>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            {Object.entries(DECISION_META).map(([key, meta]) => {
              const count = metrics.decisionsCount[key] || 0;
              const pct = metrics.total > 0 ? Math.round((count / metrics.total) * 100) : 0;
              return (
                <div key={key} style={{ background: "#f9fafb", padding: "0.7rem 0.85rem", borderRadius: "10px", border: "1px solid #f0f0f0" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8rem", marginBottom: "0.35rem" }}>
                    <span style={{ fontWeight: 700, color: "#1f2937", display: "flex", alignItems: "center", gap: "0.35rem" }}>
                      <span>{meta.icon}</span> {meta.label}
                    </span>
                    <span style={{ fontWeight: 800, color: meta.color }}>
                      {count} <span style={{ color: "#9ca3af", fontWeight: 500, fontSize: "0.72rem" }}>({pct}%)</span>
                    </span>
                  </div>
                  <div style={{ width: "100%", height: "7px", background: "#e5e7eb", borderRadius: "999px", overflow: "hidden" }}>
                    <div
                      style={{
                        width: `${pct}%`,
                        height: "100%",
                        background: meta.color,
                        borderRadius: "999px",
                        transition: "width 0.4s ease",
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </div>

      {/* ── GRID 2 COLUNAS: FAIXA ETÁRIA & PERFIL FAMILIAR / FILHOS ── */}
      <div className="dash-two-col">

        {/* ── GRÁFICO 3: COMPARAÇÃO POR FAIXA ETÁRIA ── */}
        <div
          style={{
            background: "white",
            borderRadius: "14px",
            padding: "1.2rem",
            boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
            border: "1px solid #e5e7eb",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.85rem" }}>
            <div>
              <h3 style={{ fontSize: "0.95rem", fontWeight: 800, margin: 0, color: "#111827" }}>
                🎯 Comparação por Faixa Etária
              </h3>
              <span style={{ fontSize: "0.72rem", color: "#6b7280" }}>
                Distribuição etária conforme as faixas ministeriais
              </span>
            </div>
            <span style={{
              background: "#faf5ff",
              color: "#7c3aed",
              fontWeight: 700,
              fontSize: "0.72rem",
              padding: "2px 8px",
              borderRadius: "999px",
              border: "1px solid #e9d5ff",
            }}>
              Média: {metrics.mediaIdade} anos
            </span>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "0.65rem" }}>
            {[
              { label: "Até 17 anos (Voltz / Adolescentes)", count: metrics.ageBrackets.ate17, color: "#7c3aed" },
              { label: "18 a 26 anos (Bold / Jovens)", count: metrics.ageBrackets.d18a26, color: "#E8351A" },
              { label: "27 a 35 anos (Burn / Jovens Adultos)", count: metrics.ageBrackets.d27a35, color: "#ea580c" },
              { label: "36 a 49 anos (Adultos / Família)", count: metrics.ageBrackets.d36a49, color: "#0891b2" },
              { label: "50+ anos (Melhor Idade / Família)", count: metrics.ageBrackets.d50mais, color: "#059669" },
            ].map((bracket) => {
              const pct = metrics.total > 0 ? Math.round((bracket.count / metrics.total) * 100) : 0;
              return (
                <div key={bracket.label}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem", marginBottom: "0.25rem" }}>
                    <span style={{ fontWeight: 600, color: "#374151" }}>{bracket.label}</span>
                    <span style={{ fontWeight: 700, color: bracket.color }}>
                      {bracket.count} <span style={{ color: "#9ca3af", fontWeight: 400 }}>({pct}%)</span>
                    </span>
                  </div>
                  <div style={{ width: "100%", height: "7px", background: "#f3f4f6", borderRadius: "999px", overflow: "hidden" }}>
                    <div
                      style={{
                        width: `${pct}%`,
                        height: "100%",
                        background: bracket.color,
                        borderRadius: "999px",
                        transition: "width 0.4s ease",
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── CARD 4: PERFIL FAMILIAR & FILHOS (NOVO FORMATO DO FORMULÁRIO) ── */}
        <div
          style={{
            background: "white",
            borderRadius: "14px",
            padding: "1.2rem",
            boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
            border: "1px solid #e5e7eb",
          }}
        >
          <div style={{ marginBottom: "0.85rem" }}>
            <h3 style={{ fontSize: "0.95rem", fontWeight: 800, margin: 0, color: "#111827" }}>
              👶 Estrutura Familiar & Filhos
            </h3>
            <span style={{ fontSize: "0.72rem", color: "#6b7280" }}>
              Dados coletados pela nova pergunta &quot;Possui filhos?&quot;
            </span>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "0.5rem", marginBottom: "0.85rem" }}>
            <div style={{ background: "#ecfeff", border: "1px solid #a5f3fc", borderRadius: "10px", padding: "0.65rem 0.4rem", textAlign: "center" }}>
              <div style={{ fontSize: "0.62rem", fontWeight: 700, color: "#0891b2", textTransform: "uppercase" }}>
                Com Filhos
              </div>
              <div style={{ fontSize: "1.3rem", fontWeight: 900, color: "#0891b2" }}>
                {metrics.withChildren}
              </div>
              <div style={{ fontSize: "0.62rem", color: "#0e7490" }}>
                {metrics.total > 0 ? Math.round((metrics.withChildren / metrics.total) * 100) : 0}% dos visitantes
              </div>
            </div>

            <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: "10px", padding: "0.65rem 0.4rem", textAlign: "center" }}>
              <div style={{ fontSize: "0.62rem", fontWeight: 700, color: "#16a34a", textTransform: "uppercase" }}>
                Total de Filhos
              </div>
              <div style={{ fontSize: "1.3rem", fontWeight: 900, color: "#16a34a" }}>
                {metrics.totalChildren}
              </div>
              <div style={{ fontSize: "0.62rem", color: "#15803d" }}>
                Crianças/Jovens
              </div>
            </div>

            <div style={{ background: "#fef3c7", border: "1px solid #fde68a", borderRadius: "10px", padding: "0.65rem 0.4rem", textAlign: "center" }}>
              <div style={{ fontSize: "0.62rem", fontWeight: 700, color: "#b45309", textTransform: "uppercase" }}>
                Média p/ Família
              </div>
              <div style={{ fontSize: "1.3rem", fontWeight: 900, color: "#b45309" }}>
                {metrics.mediaFilhos}
              </div>
              <div style={{ fontSize: "0.62rem", color: "#92400e" }}>
                Filhos por casal/pais
              </div>
            </div>
          </div>

          {/* Cruzamento por Estado Civil */}
          <div style={{ fontSize: "0.72rem", fontWeight: 700, color: "#6b7280", textTransform: "uppercase", marginBottom: "0.4rem" }}>
            Visitantes por Estado Civil:
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(65px, 1fr))", gap: "0.35rem" }}>
            {Object.entries(metrics.maritalCount).map(([status, count]) => (
              <div key={status} style={{ background: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: "8px", padding: "0.4rem 0.2rem", textAlign: "center" }}>
                <div style={{ fontSize: "0.6rem", color: "#6b7280", textTransform: "uppercase", fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {MARITAL_LABELS[status] || status}
                </div>
                <div style={{ fontSize: "0.95rem", fontWeight: 800, color: "#111827" }}>
                  {count}
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* ── FUNIL DO PROCESSO DE ACOLHIMENTO ── */}
      <div style={{ background: "white", borderRadius: "14px", padding: "1.2rem", boxShadow: "0 1px 3px rgba(0,0,0,0.06)", border: "1px solid #e5e7eb" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.85rem", flexWrap: "wrap", gap: "0.4rem" }}>
          <div>
            <h3 style={{ fontSize: "0.95rem", fontWeight: 800, margin: 0, color: "#111827" }}>
              🔄 Funil de Conversão do Período
            </h3>
            <span style={{ fontSize: "0.72rem", color: "#6b7280" }}>
              Evolução da recepção ao engajamento em células e redes
            </span>
          </div>
          <span style={{ fontSize: "0.72rem", fontWeight: 700, color: "#16a34a", background: "#f0fdf4", padding: "2px 8px", borderRadius: "999px" }}>
            Conversão: {metrics.taxaIntegracao}%
          </span>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "0.65rem" }}>
          <FunnelStep
            label="1. Novos Cadastros (Chegaram no período)"
            count={metrics.total}
            percent={metrics.total > 0 ? 100 : 0}
            color="#2563eb"
            badge={`${metrics.novos} pendentes`}
          />
          <FunnelStep
            label="2. Contato Realizado (WhatsApp / Ligação)"
            count={metrics.emContato + metrics.integrados}
            percent={metrics.taxaContato}
            color="#d97706"
            badge={`${metrics.emContato} em andamento`}
          />
          <FunnelStep
            label="3. Integrados (Célula / Membro Ativo)"
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
        </>
      )}
    </div>
  );
}

// ── COMPONENTE: GRÁFICO SVG RESPONSIVO COM SUPORTE A BARRAS E LINHAS ────
function TimelineChart({
  data,
  granularity,
  chartMode,
  hoveredIndex,
  onHover,
}: {
  data: {
    key: string;
    label: string;
    fullLabel: string;
    visitors: number;
    primeiraVez: number;
    decisions: number;
    aceitarJesus: number;
    reconciliacao: number;
    batismo: number;
  }[];
  granularity: Granularity;
  chartMode: "DECISIONS" | "VOLUME";
  hoveredIndex: number | null;
  onHover: (idx: number | null) => void;
}) {
  const width = 720;
  const height = 240;
  const padding = { top: 32, right: 35, bottom: 45, left: 40 };

  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  // Valor máximo para escala Y
  const maxVal =
    chartMode === "DECISIONS"
      ? Math.max(1, ...data.map((d) => Math.max(d.decisions, d.aceitarJesus + d.reconciliacao + d.batismo)))
      : Math.max(1, ...data.map((d) => Math.max(d.visitors, d.decisions)));

  const yTicks = Array.from(new Set([0, Math.ceil(maxVal / 2), maxVal]));

  // Cálculo dos pontos e posições X
  const points = data.map((d, i) => {
    const x =
      data.length > 1
        ? padding.left + (i / (data.length - 1)) * chartWidth
        : padding.left + chartWidth / 2;
    const yVisitors = padding.top + chartHeight - (d.visitors / maxVal) * chartHeight;
    const yDecisions = padding.top + chartHeight - (d.decisions / maxVal) * chartHeight;
    return { ...d, x, yVisitors, yDecisions, index: i };
  });

  // Linhas SVG para modo VOLUME
  const visitorLine = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.yVisitors}`).join(" ");
  const decisionLine = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.yDecisions}`).join(" ");

  const areaPath =
    points.length > 1
      ? `${visitorLine} L ${points[points.length - 1].x} ${padding.top + chartHeight} L ${points[0].x} ${
          padding.top + chartHeight
        } Z`
      : "";

  const barWidth = Math.min(38, Math.max(16, chartWidth / (data.length * 2.2)));
  const activePoint = hoveredIndex !== null && points[hoveredIndex] ? points[hoveredIndex] : null;

  return (
    <div style={{ position: "relative", width: "100%", overflowX: "auto" }}>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        style={{ width: "100%", height: "auto", minWidth: "500px", display: "block" }}
        onMouseLeave={() => onHover(null)}
      >
        <defs>
          <linearGradient id="visitorsAreaGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#E8351A" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#E8351A" stopOpacity="0.02" />
          </linearGradient>
        </defs>

        {/* Linhas de Grade Horizontais */}
        {yTicks.map((tick) => {
          const y = padding.top + chartHeight - (tick / maxVal) * chartHeight;
          return (
            <Fragment key={tick}>
              <line
                x1={padding.left}
                y1={y}
                x2={width - padding.right}
                y2={y}
                stroke="#f3f4f6"
                strokeWidth="1"
                strokeDasharray="4 4"
              />
              <text
                x={padding.left - 8}
                y={y + 3}
                textAnchor="end"
                fontSize="11"
                fill="#9ca3af"
                fontWeight="600"
              >
                {tick}
              </text>
            </Fragment>
          );
        })}

        {/* ── MODO 1: COMPARATIVO DE DECISÕES POR DIA (BARRAS EMPILHADAS POR DECISÃO) ── */}
        {chartMode === "DECISIONS" && (
          <g>
            {points.map((p, idx) => {
              const isHovered = hoveredIndex === idx;
              const yBase = padding.top + chartHeight;

              // Alturas de cada segmento de decisão
              const hAceitar = (p.aceitarJesus / maxVal) * chartHeight;
              const hRecon = (p.reconciliacao / maxVal) * chartHeight;
              const hBatismo = (p.batismo / maxVal) * chartHeight;
              const totalDecs = p.decisions;
              const totalBarH = (totalDecs / maxVal) * chartHeight;

              // Coordenadas Y de cada fatia empilhada
              const yAceitar = yBase - hAceitar;
              const yRecon = yAceitar - hRecon;
              const yBatismo = yRecon - hBatismo;
              const yTop = totalDecs > 0 ? yBase - totalBarH : yBase;

              const xBar = p.x - barWidth / 2;

              return (
                <g key={`dec-col-${p.key}`} onMouseEnter={() => onHover(idx)} style={{ cursor: "pointer" }}>
                  {/* Se tiver 0 decisões no dia */}
                  {totalDecs === 0 ? (
                    <rect
                      x={xBar}
                      y={yBase - 4}
                      width={barWidth}
                      height={4}
                      rx="2"
                      fill={isHovered ? "#9ca3af" : "#e5e7eb"}
                    />
                  ) : (
                    <>
                      {/* Segmento 1: Aceitar Jesus (Vermelho) */}
                      {p.aceitarJesus > 0 && (
                        <rect
                          x={xBar}
                          y={yAceitar}
                          width={barWidth}
                          height={Math.max(3, hAceitar)}
                          rx={p.reconciliacao === 0 && p.batismo === 0 ? 5 : 0}
                          fill="#E8351A"
                          opacity={isHovered ? 1 : 0.92}
                        />
                      )}

                      {/* Segmento 2: Reconciliação (Âmbar) */}
                      {p.reconciliacao > 0 && (
                        <rect
                          x={xBar}
                          y={yRecon}
                          width={barWidth}
                          height={Math.max(3, hRecon)}
                          rx={p.batismo === 0 ? 5 : 0}
                          fill="#F59E0B"
                          opacity={isHovered ? 1 : 0.92}
                        />
                      )}

                      {/* Segmento 3: Batismo (Azul) */}
                      {p.batismo > 0 && (
                        <rect
                          x={xBar}
                          y={yBatismo}
                          width={barWidth}
                          height={Math.max(3, hBatismo)}
                          rx={5}
                          fill="#0284C7"
                          opacity={isHovered ? 1 : 0.92}
                        />
                      )}

                      {/* Borda no Hover */}
                      {isHovered && (
                        <rect
                          x={xBar - 2}
                          y={yTop - 2}
                          width={barWidth + 4}
                          height={totalBarH + 4}
                          rx="6"
                          fill="none"
                          stroke="#111827"
                          strokeWidth="2"
                        />
                      )}
                    </>
                  )}

                  {/* Número total de decisões no topo de cada dia */}
                  <text
                    x={p.x}
                    y={totalDecs > 0 ? Math.max(16, yTop - 6) : yBase - 8}
                    textAnchor="middle"
                    fontSize="11"
                    fontWeight="800"
                    fill={isHovered ? "#E8351A" : totalDecs > 0 ? "#111827" : "#9ca3af"}
                  >
                    {totalDecs}
                  </text>

                  {/* Rótulo do Eixo X com dia da semana */}
                  <text
                    x={p.x}
                    y={height - 12}
                    textAnchor="middle"
                    fontSize="10.5"
                    fill={isHovered ? "#E8351A" : "#4b5563"}
                    fontWeight={isHovered ? "800" : "600"}
                  >
                    {p.label}
                  </text>
                </g>
              );
            })}
          </g>
        )}

        {/* ── MODO 2: VOLUME GERAL (LINHAS E ÁREAS) ── */}
        {chartMode === "VOLUME" && (
          <g>
            {areaPath && <path d={areaPath} fill="url(#visitorsAreaGrad)" />}

            {points.map((p, idx) => {
              const barH = (p.visitors / maxVal) * chartHeight;
              const isHovered = hoveredIndex === idx;
              return (
                <rect
                  key={`bar-${p.key}`}
                  x={p.x - barWidth / 2}
                  y={padding.top + chartHeight - barH}
                  width={barWidth}
                  height={barH}
                  rx="4"
                  fill={isHovered ? "#E8351A" : "#E8351A25"}
                  stroke={isHovered ? "#E8351A" : "none"}
                  strokeWidth="1"
                  onMouseEnter={() => onHover(idx)}
                  style={{ cursor: "pointer", transition: "all 0.15s ease" }}
                />
              );
            })}

            {decisionLine && (
              <path
                d={decisionLine}
                fill="none"
                stroke="#f59e0b"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            )}

            {visitorLine && (
              <path
                d={visitorLine}
                fill="none"
                stroke="#E8351A"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            )}

            {points.map((p, idx) => {
              const isHovered = hoveredIndex === idx;
              return (
                <g key={p.key} onMouseEnter={() => onHover(idx)} style={{ cursor: "pointer" }}>
                  <circle cx={p.x} cy={p.yDecisions} r={isHovered ? 6 : 4} fill="#f59e0b" stroke="white" strokeWidth="2" />
                  <circle cx={p.x} cy={p.yVisitors} r={isHovered ? 7 : 5} fill="#E8351A" stroke="white" strokeWidth="2.5" />
                  <text
                    x={p.x}
                    y={height - 12}
                    textAnchor="middle"
                    fontSize="10.5"
                    fill={isHovered ? "#E8351A" : "#4b5563"}
                    fontWeight={isHovered ? "800" : "600"}
                  >
                    {p.label}
                  </text>
                </g>
              );
            })}
          </g>
        )}

        {/* Linha Vertical no Ponto com Hover */}
        {activePoint && (
          <line
            x1={activePoint.x}
            y1={padding.top}
            x2={activePoint.x}
            y2={padding.top + chartHeight}
            stroke="#9ca3af"
            strokeWidth="1"
            strokeDasharray="3 3"
          />
        )}
      </svg>

      {/* Tooltip Flutuante Moderno */}
      {activePoint && (
        <div
          style={{
            position: "absolute",
            top: "8px",
            left: `${Math.min(85, Math.max(15, (activePoint.x / width) * 100))}%`,
            transform: "translateX(-50%)",
            background: "#0A0A0A",
            color: "white",
            padding: "0.6rem 0.95rem",
            borderRadius: "10px",
            fontSize: "0.75rem",
            boxShadow: "0 8px 24px rgba(0,0,0,0.35)",
            pointerEvents: "none",
            zIndex: 10,
            whiteSpace: "nowrap",
            border: "1px solid rgba(255,255,255,0.1)",
          }}
        >
          <div style={{ fontWeight: 800, borderBottom: "1px solid rgba(255,255,255,0.2)", paddingBottom: "4px", marginBottom: "6px", display: "flex", alignItems: "center", gap: "0.3rem" }}>
            <span>📅</span>
            <span>{activePoint.fullLabel}</span>
          </div>

          {chartMode === "DECISIONS" ? (
            <div style={{ display: "flex", flexDirection: "column", gap: "3px" }}>
              <div style={{ color: "#ffffff", fontWeight: 800, fontSize: "0.82rem", marginBottom: "2px" }}>
                ✝️ Total de Decisões no Dia: <strong>{activePoint.decisions}</strong>
              </div>
              <div style={{ color: "#ff8a7a", fontWeight: 600, display: "flex", alignItems: "center", gap: "5px" }}>
                <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#E8351A", display: "inline-block" }} />
                Aceitar Jesus: <strong>{activePoint.aceitarJesus}</strong>
              </div>
              <div style={{ color: "#fbbf24", fontWeight: 600, display: "flex", alignItems: "center", gap: "5px" }}>
                <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#F59E0B", display: "inline-block" }} />
                Reconciliação: <strong>{activePoint.reconciliacao}</strong>
              </div>
              <div style={{ color: "#38bdf8", fontWeight: 600, display: "flex", alignItems: "center", gap: "5px" }}>
                <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#0284C7", display: "inline-block" }} />
                Batismo: <strong>{activePoint.batismo}</strong>
              </div>
              <div style={{ borderTop: "1px dashed rgba(255,255,255,0.15)", marginTop: "4px", paddingTop: "4px", color: "#9ca3af", fontSize: "0.7rem" }}>
                📋 Cadastros Totais: {activePoint.visitors} ({activePoint.primeiraVez} de 1ª vez)
              </div>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "3px" }}>
              <div style={{ color: "#ff8a7a", fontWeight: 600 }}>
                ● Total de Cadastros: <strong>{activePoint.visitors}</strong> ({activePoint.primeiraVez} de 1ª vez)
              </div>
              <div style={{ color: "#fbbf24", fontWeight: 600 }}>
                ● Decisões de Fé: <strong>{activePoint.decisions}</strong>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── COMPONENTES AUXILIARES ───────────────────────────────
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
    <div
      style={{
        background: "white",
        borderRadius: "12px",
        padding: "0.85rem 1rem",
        boxShadow: highlight ? "0 2px 8px rgba(37,99,235,0.12)" : "0 1px 3px rgba(0,0,0,0.06)",
        border: highlight ? "1.5px solid #2563eb30" : "1px solid #f0f0f0",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
      }}
    >
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
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "0.78rem", marginBottom: "0.25rem" }}>
        <span style={{ fontWeight: 600, color: "#374151" }}>{label}</span>
        <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
          {badge && (
            <span style={{ fontSize: "0.68rem", fontWeight: 700, color, background: `${color}15`, padding: "1px 6px", borderRadius: "999px" }}>
              {badge}
            </span>
          )}
          <span style={{ fontWeight: 700, color: "#111827" }}>
            {count} <span style={{ color: "#9ca3af", fontWeight: 400 }}>({percent}%)</span>
          </span>
        </div>
      </div>
      <div style={{ width: "100%", height: "8px", background: "#f3f4f6", borderRadius: "999px", overflow: "hidden" }}>
        <div
          style={{
            width: `${percent}%`,
            height: "100%",
            background: color,
            borderRadius: "999px",
            transition: "width 0.4s ease",
          }}
        />
      </div>
    </div>
  );
}

// ── COMPONENTE EXCLUSIVO DO LÍDER: FOCO EM CONTATOS, RETORNOS E PENDÊNCIAS ────
function LeaderDashboardView({
  metrics,
  filteredVisitors,
  groups,
  timelineData,
  granularity,
  hoveredPointIndex,
  setHoveredPointIndex,
}: {
  metrics: {
    total: number;
    novos: number;
    emContato: number;
    integrados: number;
    semResposta: number;
    taxaIntegracao: number;
    taxaContato: number;
  };
  filteredVisitors: Visitor[];
  groups: Group[];
  timelineData: {
    key: string;
    label: string;
    fullLabel: string;
    visitors: number;
    primeiraVez: number;
    decisions: number;
    aceitarJesus: number;
    reconciliacao: number;
    batismo: number;
  }[];
  granularity: Granularity;
  hoveredPointIndex: number | null;
  setHoveredPointIndex: (idx: number | null) => void;
}) {
  const pendingVisitors = filteredVisitors.filter((v) => v.status === "NOVO");

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.1rem" }}>
      {/* 1. QUANTIFICAÇÃO DOS CONTATOS & RETORNOS */}
      <div className="dash-kpi-grid">
        <KpiCard
          title="Contatos Recebidos"
          value={metrics.total}
          subtitle={`Chegados na Rede ${groups.map((g) => g.name).join(", ")}`}
          color="#0A0A0A"
          icon="📥"
          highlight={metrics.total > 0}
        />
        <KpiCard
          title="Pendências (Novos)"
          value={metrics.novos}
          subtitle="Aguardando 1º contato"
          color="#d97706"
          icon="⚠️"
          highlight={metrics.novos > 0}
        />
        <KpiCard
          title="Em Andamento"
          value={metrics.emContato}
          subtitle="Contato feito / Acolhendo"
          color="#2563eb"
          icon="💬"
        />
        <KpiCard
          title="Retornos Concluídos"
          value={metrics.integrados}
          subtitle="Integrados na célula/igreja"
          color="#16a34a"
          icon="✅"
        />
        <KpiCard
          title="Sem Retorno"
          value={metrics.semResposta}
          subtitle="Tentativas sem resposta"
          color="#6b7280"
          icon="⚪"
        />
        <KpiCard
          title="Taxa de Efetividade"
          value={`${metrics.taxaIntegracao}%`}
          subtitle={`${metrics.taxaContato}% contato iniciado`}
          color="#7c3aed"
          icon="📈"
          isHero
        />
      </div>


      {/* 3. FLUXO DE RETORNO & CONVERSÃO (FUNIL DE ACOLHIMENTO DA REDE) */}
      <div style={{ background: "white", borderRadius: "14px", padding: "1.2rem", boxShadow: "0 1px 3px rgba(0,0,0,0.06)", border: "1px solid #e5e7eb" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.85rem", flexWrap: "wrap", gap: "0.4rem" }}>
          <div>
            <h3 style={{ fontSize: "0.95rem", fontWeight: 800, margin: 0, color: "#111827" }}>
              🔄 Fluxo de Retorno & Conversão da Rede
            </h3>
            <span style={{ fontSize: "0.72rem", color: "#6b7280" }}>
              Acompanhamento da taxa de atendimento e integração dos contatos recebidos
            </span>
          </div>
          <span style={{ fontSize: "0.72rem", fontWeight: 700, color: "#16a34a", background: "#f0fdf4", padding: "2px 8px", borderRadius: "999px" }}>
            Taxa de Integração: {metrics.taxaIntegracao}%
          </span>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "0.65rem" }}>
          <FunnelStep
            label="1. Contatos Recebidos (Chegaram no período)"
            count={metrics.total}
            percent={metrics.total > 0 ? 100 : 0}
            color="#2563eb"
            badge={`${metrics.novos} pendências`}
          />
          <FunnelStep
            label="2. Retornos Realizados (Contato iniciado)"
            count={metrics.emContato + metrics.integrados}
            percent={metrics.taxaContato}
            color="#d97706"
            badge={`${metrics.emContato} em andamento`}
          />
          <FunnelStep
            label="3. Retornos Concluídos (Integrados ao GDC / Igreja)"
            count={metrics.integrados}
            percent={metrics.taxaIntegracao}
            color="#16a34a"
            badge={`${metrics.integrados} integrados`}
          />
          {metrics.semResposta > 0 && (
            <FunnelStep
              label="4. Sem Retorno / Tentativas Esgotadas"
              count={metrics.semResposta}
              percent={metrics.total > 0 ? Math.round((metrics.semResposta / metrics.total) * 100) : 0}
              color="#9ca3af"
            />
          )}
        </div>
      </div>

      {/* 4. EVOLUÇÃO TEMPORAL DE CONTATOS (QUANDO HOUVER DADOS) */}
      {timelineData.length > 0 && (
        <div style={{ background: "white", borderRadius: "14px", padding: "1.2rem", boxShadow: "0 1px 3px rgba(0,0,0,0.06)", border: "1px solid #e5e7eb" }}>
          <div style={{ marginBottom: "0.85rem" }}>
            <h3 style={{ fontSize: "0.95rem", fontWeight: 800, margin: 0, color: "#111827" }}>
              📈 Fluxo Temporal de Contatos Recebidos
            </h3>
            <span style={{ fontSize: "0.72rem", color: "#6b7280" }}>
              Volume de pessoas que chegaram na sua rede por data
            </span>
          </div>
          <TimelineChart
            data={timelineData}
            granularity={granularity}
            chartMode="VOLUME"
            hoveredIndex={hoveredPointIndex}
            onHover={setHoveredPointIndex}
          />
        </div>
      )}
    </div>
  );
}
