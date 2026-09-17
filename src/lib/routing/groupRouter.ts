// ============================================================
// groupRouter.ts — Algoritmo de Roteamento de Visitantes
// Igreja da Cidade Taubaté
// ============================================================

export type MaritalStatus =
  | "SOLTEIRO"
  | "CASADO"
  | "NOIVO"
  | "DIVORCIADO"
  | "VIUVO";

export type GroupName = "VOLTZ" | "BOLD" | "BURN" | "A3";

export type Decision =
  | "ACEITAR_JESUS"
  | "RECONCILIACAO"
  | "BATISMO"
  | "EVANGELISMO";

export type VisitReason = "PRIMEIRA_VEZ" | "DECISAO";

export interface VisitorFormData {
  fullName: string;
  phone: string;
  neighborhood: string;
  city: string;
  maritalStatus: MaritalStatus;
  birthDate: string; // ISO 8601 "YYYY-MM-DD"
  visitReason: VisitReason;
  decisions?: Decision[];
}

export interface RoutingResult {
  group: GroupName;
  calculatedAge: number;
  reason: string;
}

/**
 * Calcula a idade exata do visitante na data de hoje.
 * Considera mês e dia para precisão (não apenas diferença de anos).
 */
export function calculateAge(birthDateStr: string): number {
  const today = new Date();
  const birth = new Date(birthDateStr);

  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();

  // Subtrai 1 se ainda não fez aniversário este ano
  if (
    monthDiff < 0 ||
    (monthDiff === 0 && today.getDate() < birth.getDate())
  ) {
    age--;
  }

  return age;
}

/**
 * Regra de negócio principal.
 *
 * Determina o grupo destino com base nos dados do formulário.
 * Prioridade em cascata:
 *   1. Casado(a) ou Noivo(a) → A3 (independente da idade)
 *   2. Demais estados civis → faixa etária
 *      - Até 17 anos → VOLTZ
 *      - 18–26 anos → BOLD
 *      - 27 anos ou mais → BURN
 */
export function resolveGroup(data: VisitorFormData): RoutingResult {
  const age = calculateAge(data.birthDate);

  // ── Regra 1: Prioridade Máxima — Casado(a) ou Noivo(a) → A3 ──
  if (data.maritalStatus === "CASADO" || data.maritalStatus === "NOIVO") {
    return {
      group: "A3",
      calculatedAge: age,
      reason:
        `Estado civil ${data.maritalStatus === "CASADO" ? "Casado(a)" : "Noivo(a)"}: direcionado ao grupo A3 (Casais / Família), independente da idade.`,
    };
  }

  // ── Regra 2: Demais estados civis (Solteiro, Viúvo, Divorciado) — Faixa Etária ──

  // Até 17 anos → VOLTZ (Adolescentes)
  if (age <= 17) {
    return {
      group: "VOLTZ",
      calculatedAge: age,
      reason: `Idade ${age} anos (até 17 anos): direcionado ao Voltz (Adolescentes).`,
    };
  }

  // 18 a 26 anos → BOLD (Jovens)
  if (age >= 18 && age <= 26) {
    return {
      group: "BOLD",
      calculatedAge: age,
      reason: `Idade ${age} anos (18 a 26 anos): direcionado ao Bold (Jovens).`,
    };
  }

  // 27 anos ou mais → BURN (sem limite de 35 anos)
  return {
    group: "BURN",
    calculatedAge: age,
    reason: `Idade ${age} anos (27 anos ou mais): direcionado ao Burn.`,
  };
}
