// src/lib/telegram.ts
// Bot de acolhimento — IC Taubaté

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN!;
const APP_URL = (process.env.NEXT_PUBLIC_APP_URL ?? "https://ictaubate.online").replace(/\/$/, "");
const TELEGRAM_API = `https://api.telegram.org/bot${BOT_TOKEN}`;

const REASON_LABELS: Record<string, string> = {
  QUERO_GDC:    "Quero um GDC",
  PRIMEIRA_VEZ: "Primeira Vez",
  EVANGELISMO:  "Evangelismo",
  DECISAO:      "Tomei uma Decisão",
};

// ── Envio genérico de mensagem ──────────────────────────────
export async function sendTelegramMessage(
  chatId: string | number,
  text: string,
  replyMarkup?: object
): Promise<void> {
  if (!BOT_TOKEN) {
    console.warn("[telegram] TELEGRAM_BOT_TOKEN não configurado.");
    return;
  }

  const body: Record<string, unknown> = {
    chat_id: chatId,
    text,
    parse_mode: "HTML",
  };
  if (replyMarkup) body.reply_markup = replyMarkup;

  const res = await fetch(`${TELEGRAM_API}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.text();
    console.error("[telegram] sendMessage error:", err);
  }
}

// ── Notifica líderes quando novo visitante chega ────────────
export async function notifyLeaders(
  visitor: {
    id: string;
    fullName: string;
    phone: string;
    neighborhood: string;
    city: string;
    visitReason: string;
    decisions: string | null;
  },
  groupLeaders: { user: { telegramChatId?: string | null; name: string } }[]
): Promise<void> {
  const leadersWithTelegram = groupLeaders.filter((gl) => gl.user.telegramChatId);
  if (leadersWithTelegram.length === 0) return;

  const reasonLabel = REASON_LABELS[visitor.visitReason] ?? visitor.visitReason;

  const text =
    `🆕 <b>Novo Contato Recebido!</b>\n\n` +
    `👤 <b>Nome:</b> ${visitor.fullName}\n` +
    `📞 <b>Telefone:</b> ${visitor.phone}\n` +
    `🏘️ <b>Bairro:</b> ${visitor.neighborhood}, ${visitor.city}\n` +
    `📋 <b>Motivo:</b> ${reasonLabel}\n\n` +
    `━━━━━━━━━━━━━━━━━\n` +
    `👇 <b>Dar retorno agora:</b>`;

  const contactUrl = `${APP_URL}/api/contact/${visitor.id}`;

  const replyMarkup = {
    inline_keyboard: [[
      { text: "💬 Enviar WhatsApp e marcar Em Contato", url: contactUrl },
    ]],
  };

  await Promise.allSettled(
    leadersWithTelegram.map((gl) =>
      sendTelegramMessage(gl.user.telegramChatId!, text, replyMarkup)
    )
  );
}
