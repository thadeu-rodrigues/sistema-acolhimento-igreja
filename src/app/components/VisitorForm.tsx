"use client";

import { useActionState, useState, useTransition, useEffect } from "react";
import { submitVisitor, VisitorFormState } from "@/app/actions/submitVisitor";

// ── Tipos locais ──────────────────────────────────────────
type MaritalStatus = "SOLTEIRO" | "CASADO" | "NOIVO" | "DIVORCIADO" | "VIUVO";
type VisitReason = "QUERO_GDC" | "PRIMEIRA_VEZ" | "EVANGELISMO" | "DECISAO";
type Decision = "ACEITAR_JESUS" | "RECONCILIACAO" | "BATISMO";

const MARITAL_OPTIONS: { value: MaritalStatus; label: string }[] = [
  { value: "SOLTEIRO", label: "Solteiro(a)" },
  { value: "CASADO", label: "Casado(a)" },
  { value: "NOIVO", label: "Noivo(a)" },
  { value: "DIVORCIADO", label: "Divorciado(a)" },
  { value: "VIUVO", label: "Viúvo(a)" },
];

const REASON_OPTIONS: { value: VisitReason; label: string; id: string }[] = [
  { value: "QUERO_GDC",    label: "Quero um GDC",     id: "reason-gdc" },
  { value: "PRIMEIRA_VEZ", label: "Primeira Vez",      id: "reason-primeira" },
  { value: "EVANGELISMO",  label: "Evangelismo",       id: "reason-evangelismo" },
  { value: "DECISAO",      label: "Tomei uma Decisão", id: "reason-decisao" },
];

const DECISION_OPTIONS: { value: Decision; label: string; numberPrefix: string }[] = [
  { value: "ACEITAR_JESUS", label: "Aceitar Jesus", numberPrefix: "1" },
  { value: "RECONCILIACAO", label: "Reconciliação", numberPrefix: "2" },
  { value: "BATISMO",       label: "Batismo",       numberPrefix: "3" },
];

const GROUP_LABELS: Record<string, { name: string; desc: string }> = {
  VOLTZ:   { name: "Voltz",       desc: "Rede de Adolescentes" },
  BOLD:    { name: "Bold",        desc: "Rede de Jovens" },
  BURN:    { name: "Burn",        desc: "Rede de Jovens Adultos" },
  A3:      { name: "A3",          desc: "Rede de Casais e Família" },
};

// ── Funções utilitárias ───────────────────────────────────

function applyPhoneMask(value: string): string {
  if (!value) return "";
  let digits = value.replace(/\D/g, "");

  // Remove prefixo internacional +55 comum em autopreenchimento de contatos no iOS/Android
  if (digits.startsWith("55") && digits.length > 11) {
    digits = digits.slice(2);
  }
  // Remove prefixo 0 de operadora (ex: 012...)
  if (digits.startsWith("0") && digits.length > 11) {
    digits = digits.slice(1);
  }

  digits = digits.slice(0, 11);

  if (digits.length === 0) return "";
  if (digits.length <= 2) return `(${digits}`;
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  }
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

// ── Componente Principal ──────────────────────────────────

const initialState: VisitorFormState = { success: false };

export default function VisitorForm() {
  const [state, formAction] = useActionState(submitVisitor, initialState);
  const [isPending, startTransition] = useTransition();

  // Estado local dos campos interativos
  const [phone, setPhone] = useState("");
  const [marital, setMarital] = useState<MaritalStatus | "">("");
  const [hasChildren, setHasChildren] = useState<boolean | null>(null);
  const [childrenCount, setChildrenCount] = useState<string>("");
  const [visitReason, setVisitReason] = useState<VisitReason | "">("");
  const [decisions, setDecisions] = useState<Decision[]>([]);

  const [clientError, setClientError] = useState<string | null>(null);

  // Redirecionamento fallback caso o Server Action não tenha redirecionado nativamente
  useEffect(() => {
    if (state.success && state.group) {
      window.location.href = `/obrigado?grupo=${encodeURIComponent(state.group)}`;
    }
  }, [state]);

  const toggleDecision = (d: Decision) => {
    setDecisions((prev) =>
      prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d]
    );
  };

  return (
    <main>
      {/* ── Hero (preto) ── */}
      <header className="hero-section">
        {/* Logo */}
        <div className="ic-logo-wrap">
          <img src="/logo-ic.png" alt="Igreja da Cidade Taubaté" className="ic-logo-img" />
          <div className="ic-logo-text">
            Igreja<br />da Cidade<br />Taubaté
          </div>
        </div>

        {/* Título */}
        <h1 className="display-xl">
          BEM-VINDO<span className="ic-asterisk">*</span>
        </h1>
        <p style={{
          marginTop: "0.75rem",
          color: "rgba(255,255,255,0.65)",
          fontSize: "0.9rem",
          maxWidth: "280px",
          lineHeight: 1.6,
        }}>
          Preencha o formulário e nossa equipe de acolhimento entrará em contato.
        </p>
      </header>

      {/* ── Formulário (branco) ── */}
      <section className="form-section">
        <form
          action={(formData) => startTransition(() => formAction(formData))}
          onSubmit={(e) => {
            setClientError(null);
            if (!marital) {
              e.preventDefault();
              setClientError("Por favor, selecione seu Estado Civil.");
              document.getElementById("marital-section")?.scrollIntoView({ behavior: "smooth", block: "center" });
              return;
            }
            if (hasChildren === null) {
              e.preventDefault();
              setClientError("Por favor, responda se possui filhos.");
              document.getElementById("children-section")?.scrollIntoView({ behavior: "smooth", block: "center" });
              return;
            }
            if (hasChildren && (!childrenCount || Number(childrenCount) <= 0)) {
              e.preventDefault();
              setClientError("Por favor, informe quantos filhos possui.");
              document.getElementById("children-count-input")?.focus();
              return;
            }
            if (!visitReason) {
              e.preventDefault();
              setClientError("Por favor, selecione o Motivo da Visita.");
              document.getElementById("visit-reason-section")?.scrollIntoView({ behavior: "smooth", block: "center" });
              return;
            }
            if (visitReason === "DECISAO" && decisions.length === 0) {
              e.preventDefault();
              setClientError("Por favor, selecione qual decisão você tomou.");
              document.getElementById("visit-reason-section")?.scrollIntoView({ behavior: "smooth", block: "center" });
              return;
            }
          }}
        >
          {/* Mensagem de erro global */}
          {!state.success && state.message && (
            <div
              style={{
                background: "#fff8f7",
                border: "1.5px solid var(--ic-red)",
                borderRadius: "var(--radius-md)",
                padding: "0.75rem 1rem",
                marginBottom: "1.25rem",
                fontSize: "0.85rem",
                color: "var(--ic-red)",
                fontWeight: 500,
              }}
            >
              {state.message}
            </div>
          )}

          {/* ── Nome Completo ── */}
          <div className="form-group">
            <label className="form-label" htmlFor="fullName">
              Nome Completo
            </label>
            <input
              id="fullName"
              name="fullName"
              type="text"
              autoComplete="name"
              placeholder="Seu nome completo"
              className={`form-input ${state.errors?.fullName ? "error" : ""}`}
              required
            />
            {state.errors?.fullName && (
              <span className="form-error">⚠ {state.errors.fullName[0]}</span>
            )}
          </div>

          {/* ── Telefone / WhatsApp ── */}
          <div className="form-group">
            <label className="form-label" htmlFor="phone">
              WhatsApp
            </label>
            <input
              id="phone"
              name="phone"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              placeholder="(12) 99999-0000"
              maxLength={15}
              value={phone}
              onChange={(e) => setPhone(applyPhoneMask(e.target.value))}
              className={`form-input ${state.errors?.phone ? "error" : ""}`}
              required
            />
            {state.errors?.phone && (
              <span className="form-error">⚠ {state.errors.phone[0]}</span>
            )}
          </div>

          {/* ── Cidade ── */}
          <div className="form-group">
            <label className="form-label" htmlFor="city">
              Cidade
            </label>
            <input
              id="city"
              name="city"
              type="text"
              placeholder="Taubaté"
              defaultValue="Taubaté"
              className={`form-input ${state.errors?.city ? "error" : ""}`}
              required
            />
            {state.errors?.city && (
              <span className="form-error">⚠ {state.errors.city[0]}</span>
            )}
          </div>

          {/* ── Bairro ── */}
          <div className="form-group">
            <label className="form-label" htmlFor="neighborhood">
              Bairro
            </label>
            <input
              id="neighborhood"
              name="neighborhood"
              type="text"
              placeholder="Seu bairro"
              className={`form-input ${state.errors?.neighborhood ? "error" : ""}`}
              required
            />
            {state.errors?.neighborhood && (
              <span className="form-error">⚠ {state.errors.neighborhood[0]}</span>
            )}
          </div>

          {/* ── Estado Civil (Pills) ── */}
          <div className="form-group" id="marital-section">
            <label className="form-label">Estado Civil</label>
            <input type="hidden" name="maritalStatus" value={marital} />
            <div className="pill-group">
              {MARITAL_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  id={`marital-${opt.value}`}
                  onClick={() => {
                    setMarital(opt.value);
                    setClientError(null);
                  }}
                  className={`pill-btn ${marital === opt.value ? "selected" : ""}`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            {state.errors?.maritalStatus && (
              <span className="form-error">⚠ Selecione o estado civil</span>
            )}
          </div>

          {/* ── Possui Filhos (Pills + Campo Condicional) ── */}
          <div className="form-group" id="children-section">
            <label className="form-label">Possui filhos?</label>
            <input
              type="hidden"
              name="hasChildren"
              value={hasChildren === null ? "" : hasChildren ? "true" : "false"}
            />
            <div className="pill-group">
              <button
                type="button"
                id="children-no"
                onClick={() => {
                  setHasChildren(false);
                  setChildrenCount("");
                  setClientError(null);
                }}
                className={`pill-btn ${hasChildren === false ? "selected" : ""}`}
              >
                Não
              </button>
              <button
                type="button"
                id="children-yes"
                onClick={() => {
                  setHasChildren(true);
                  if (!childrenCount) setChildrenCount("1");
                  setClientError(null);
                }}
                className={`pill-btn ${hasChildren === true ? "selected" : ""}`}
              >
                Sim
              </button>
            </div>
            {state.errors?.hasChildren && (
              <span className="form-error">⚠ Responda se possui filhos</span>
            )}

            {hasChildren && (
              <div style={{ marginTop: "0.65rem", animation: "slideDown 0.2s ease" }}>
                <label
                  className="form-label"
                  htmlFor="children-count-input"
                  style={{ fontSize: "0.78rem", color: "var(--ic-gray-600)", marginBottom: "0.3rem" }}
                >
                  Quantos filhos?
                </label>
                <input
                  id="children-count-input"
                  name="childrenCount"
                  type="number"
                  min={1}
                  max={20}
                  value={childrenCount}
                  onChange={(e) => setChildrenCount(e.target.value)}
                  placeholder="Ex: 1"
                  className={`form-input ${state.errors?.childrenCount ? "error" : ""}`}
                  required
                />
                {state.errors?.childrenCount && (
                  <span className="form-error">⚠ {state.errors.childrenCount[0]}</span>
                )}
              </div>
            )}
          </div>

          {/* ── Data de Nascimento ── */}
          <div className="form-group">
            <label className="form-label" htmlFor="birthDate">
              Data de Nascimento
            </label>
            <input
              id="birthDate"
              name="birthDate"
              type="date"
              max={new Date().toISOString().split("T")[0]}
              className={`form-input ${state.errors?.birthDate ? "error" : ""}`}
              required
              style={{ colorScheme: "light" }}
            />
            {state.errors?.birthDate && (
              <span className="form-error">⚠ {state.errors.birthDate[0]}</span>
            )}
          </div>

          <div className="divider" />

          {/* ── Motivo da Visita / Decisão (Cards) ── */}
          <div className="form-group" id="visit-reason-section">
            <label className="form-label">Motivo da Visita</label>
            <input type="hidden" name="visitReason" value={visitReason} />
            <div className="reason-grid">
              {REASON_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  id={opt.id}
                  onClick={() => {
                    setVisitReason(opt.value);
                    if (opt.value !== "DECISAO") {
                      setDecisions([]);
                    }
                    setClientError(null);
                  }}
                  className={`reason-card ${visitReason === opt.value ? "selected" : ""}`}
                >
                  <div className="radio-dot" />
                  <span className="reason-card-label">{opt.label}</span>
                </button>
              ))}
            </div>
            {state.errors?.visitReason && (
              <span className="form-error" style={{ marginTop: "0.25rem" }}>
                ⚠ Selecione o motivo da visita
              </span>
            )}

            {/* Checkboxes condicionais */}
            {visitReason === "DECISAO" && (
              <div className="decision-list">
                <p style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--ic-gray-600)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "0.25rem" }}>
                  Qual decisão você tomou?
                </p>
                {DECISION_OPTIONS.map((opt) => {
                  const checked = decisions.includes(opt.value);
                  return (
                    <label key={opt.value} className="decision-item">
                      <input
                        type="checkbox"
                        name="decisions"
                        value={opt.value}
                        checked={checked}
                        onChange={() => toggleDecision(opt.value)}
                        className="sr-only"
                      />
                      <div
                        className={`decision-checkbox ${checked ? "checked" : ""}`}
                        aria-hidden="true"
                      />
                      <span className="decision-label">
                        <strong>{opt.numberPrefix} — </strong> {opt.label}
                      </span>
                    </label>
                  );
                })}
              </div>
            )}
          </div>


          {/* Mensagem de Erro (visível logo acima do botão Enviar) */}
          {(clientError || (!state.success && state.message)) && (
            <div
              id="form-error-bottom"
              style={{
                background: "#fff1f0",
                border: "1.5px solid var(--ic-red)",
                borderRadius: "var(--radius-md)",
                padding: "0.75rem 1rem",
                marginBottom: "1rem",
                fontSize: "0.85rem",
                color: "var(--ic-red)",
                fontWeight: 600,
                textAlign: "center",
              }}
            >
              ⚠ {clientError || state.message}
            </div>
          )}

          {/* ── Botão Submit (Apenas "Enviar") ── */}
          <button
            type="submit"
            id="submit-visitor-form"
            className="btn-primary"
            disabled={isPending}
            style={{ width: "100%", justifyContent: "center" }}
          >
            {isPending ? "Enviando..." : "Enviar"}
          </button>

          <p style={{
            textAlign: "center",
            fontSize: "0.7rem",
            color: "var(--ic-gray-400)",
            marginTop: "1rem",
            lineHeight: 1.6,
          }}>
            Seus dados são usados apenas para contato da equipe de acolhimento.
          </p>
        </form>
      </section>
    </main>
  );
}
