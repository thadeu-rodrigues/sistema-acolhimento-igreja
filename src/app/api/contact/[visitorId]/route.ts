// src/app/api/contact/[visitorId]/route.ts
// Atualiza status NOVO → EM_CONTATO e redireciona para o WhatsApp com mensagem pronta

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// ── Helpers (espelho do DashboardClient para uso server-side) ──
function getMotivoText(visitReason?: string, decisions?: string | null): string {
  if (visitReason === "PRIMEIRA_VEZ")
    return "Vi aqui que você teve contato pela primeira vez com a nossa igreja!";
  if (visitReason === "QUERO_GDC")
    return "Vi que você gostaria de conhecer um grupo da cidade!";
  if (visitReason === "EVANGELISMO")
    return "Vi que você conversou com a nossa equipe em uma ação de evangelismo!";
  if (visitReason === "DECISAO" || (decisions && decisions !== "[]")) {
    let decs: string[] = [];
    try { decs = JSON.parse(decisions || "[]") as string[]; } catch { /* noop */ }
    const hasAceitar = decs.includes("ACEITAR_JESUS");
    const hasRecon   = decs.includes("RECONCILIACAO");
    const hasBatismo = decs.includes("BATISMO");
    if (hasAceitar && hasBatismo) return "Vi aqui que você tomou a decisão de aceitar a Jesus e também pelo batismo!";
    if (hasRecon   && hasBatismo) return "Vi aqui que você tomou a decisão de se reconciliar com Jesus e também pelo batismo!";
    if (hasAceitar) return "Vi aqui que você tomou a decisão de aceitar a Jesus!";
    if (hasRecon)   return "Vi aqui que você tomou a decisão de se reconciliar com Jesus!";
    if (hasBatismo) return "Vi aqui que você tomou a decisão pelo batismo!";
    return "Vi aqui que você tomou uma decisão de fé!";
  }
  return "Vi aqui que você teve contato pela primeira vez com a nossa igreja!";
}

function buildWhatsAppUrl(
  phone: string,
  name: string,
  template: string | null | undefined,
  leaderName: string | null | undefined,
  visitReason: string,
  decisions: string | null
): string {
  const digits     = phone.replace(/\D/g, "");
  const firstName  = name.trim().split(" ")[0];
  const motivoText = getMotivoText(visitReason, decisions);

  let text = template ?? null;
  if (text) {
    text = text
      .replace(/\{nome\}/gi,                     firstName)
      .replace(/\{lider\}/gi,                    leaderName || "da equipe de acolhimento")
      .replace(/\{motivo\}|\{\*1\*\}|\{decisao\}/gi, motivoText);
    if (text.includes("da rede") && !template?.includes("{motivo}")) {
      text = `Olá ${firstName}! Sou da equipe de acolhimento da Igreja da Cidade em Taubaté! Como você está? ${motivoText} Gostaria de ter mais informações?`;
    }
  } else {
    text = `Olá ${firstName}! Sou da equipe de acolhimento da Igreja da Cidade em Taubaté! Como você está? ${motivoText} Gostaria de ter mais informações?`;
  }

  return `https://wa.me/55${digits}?text=${encodeURIComponent(text)}`;
}

// ── Handler ────────────────────────────────────────────────
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ visitorId: string }> }
) {
  const { visitorId } = await params;

  try {
    const visitor = await prisma.visitor.findUnique({
      where: { id: visitorId },
      include: { group: true, assignedLeader: true },
    });

    if (!visitor) {
      return new NextResponse("Visitante não encontrado.", { status: 404 });
    }

    // Atualiza status apenas se ainda for NOVO
    if (visitor.status === "NOVO") {
      await prisma.visitor.update({
        where: { id: visitorId },
        data: { status: "EM_CONTATO" },
      });
    }

    const waUrl = buildWhatsAppUrl(
      visitor.phone,
      visitor.fullName,
      visitor.group?.whatsappTemplate,
      visitor.assignedLeader?.name,
      visitor.visitReason,
      visitor.decisions
    );

    return NextResponse.redirect(waUrl, { status: 302 });
  } catch (err) {
    console.error("[contact/redirect] Error:", err);
    return new NextResponse("Erro interno.", { status: 500 });
  }
}
