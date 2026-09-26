// src/app/api/telegram/webhook/route.ts
// Recebe updates do Telegram Bot — processa /start TOKEN para vincular líderes

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendTelegramMessage } from "@/lib/telegram";

const WEBHOOK_SECRET = process.env.TELEGRAM_WEBHOOK_SECRET;

export async function POST(req: NextRequest) {
  // Verifica o secret do webhook
  const secret = req.headers.get("x-telegram-bot-api-secret-token");
  if (WEBHOOK_SECRET && secret !== WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: true });
  }

  const message = body?.message;
  if (!message) return NextResponse.json({ ok: true });

  const chatId: number = message.chat?.id;
  const text: string = message.text ?? "";

  if (text.startsWith("/start ")) {
    const token = text.replace("/start ", "").trim();
    if (token) await handleStartToken(chatId, token);
  } else if (text === "/start") {
    await sendTelegramMessage(
      chatId,
      "👋 <b>Bot de Acolhimento — IC Taubaté</b>\n\nPara conectar sua conta, peça ao administrador um link de conexão."
    );
  }

  return NextResponse.json({ ok: true });
}

async function handleStartToken(chatId: number, token: string) {
  try {
    const linkToken = await prisma.telegramLinkToken.findUnique({
      where: { token },
      include: { user: true },
    });

    if (!linkToken) {
      await sendTelegramMessage(
        chatId,
        "❌ <b>Link inválido ou já utilizado.</b>\nPeça ao administrador um novo link de conexão."
      );
      return;
    }

    if (new Date() > linkToken.expiresAt) {
      await prisma.telegramLinkToken.delete({ where: { token } });
      await sendTelegramMessage(
        chatId,
        "⏰ <b>Link expirado.</b>\nPeça ao administrador gerar um novo link (válido por 30 minutos)."
      );
      return;
    }

    // Vincula o chatId ao usuário
    await prisma.user.update({
      where: { id: linkToken.userId },
      data: {
        telegramChatId: String(chatId),
        telegramLinkedAt: new Date(),
      },
    });

    // Consome o token (uso único)
    await prisma.telegramLinkToken.delete({ where: { token } });

    await sendTelegramMessage(
      chatId,
      `✅ <b>Telegram conectado com sucesso!</b>\n\n` +
      `Olá, <b>${linkToken.user.name}</b>! 🎉\n\n` +
      `Você receberá uma notificação aqui sempre que um novo visitante da sua rede preencher a ficha de cadastro — junto com um link direto para o WhatsApp.\n\n` +
      `<i>IC Taubaté — Bot de Acolhimento</i>`
    );
  } catch (err) {
    console.error("[telegram/webhook] handleStartToken error:", err);
  }
}
