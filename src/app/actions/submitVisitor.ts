// src/app/actions/submitVisitor.ts
"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { resolveGroup } from "@/lib/routing/groupRouter";

// ── Zod Schema — Validação do formulário ──────────────────
const visitorSchema = z.object({
  fullName: z.string().min(3, "Nome deve ter ao menos 3 caracteres"),
  phone: z
    .string()
    .regex(/^\(\d{2}\)\s9\d{4}-\d{4}$/, "Telefone inválido. Use: (XX) 9XXXX-XXXX"),
  neighborhood: z.string().min(2, "Informe o bairro ou cidade"),
  city: z.string().min(2, "Informe a cidade"),
  maritalStatus: z.enum(["SOLTEIRO", "CASADO", "NOIVO", "DIVORCIADO", "VIUVO"]),
  birthDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Data inválida"),
  visitReason: z.enum(["PRIMEIRA_VEZ", "DECISAO"]),
  decisions: z
    .array(z.enum(["ACEITAR_JESUS", "RECONCILIACAO", "BATISMO", "EVANGELISMO"]))
    .optional(),
});

export type VisitorFormState = {
  success: boolean;
  message?: string;
  errors?: Record<string, string[]>;
  group?: string;
};

export async function submitVisitor(
  _prevState: VisitorFormState,
  formData: FormData
): Promise<VisitorFormState> {
  // Normalize phone number (suporta dígitos puros, +55 e formatos de autopreenchimento iOS/Android)
  let rawPhone = String(formData.get("phone") || "").trim();
  let digits = rawPhone.replace(/\D/g, "");
  if (digits.startsWith("55") && digits.length > 11) digits = digits.slice(2);
  if (digits.startsWith("0") && digits.length > 11) digits = digits.slice(1);
  if (digits.length === 11) {
    rawPhone = `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  }

  const raw = {
    fullName: formData.get("fullName"),
    phone: rawPhone,
    neighborhood: formData.get("neighborhood"),
    city: formData.get("city"),
    maritalStatus: formData.get("maritalStatus"),
    birthDate: formData.get("birthDate"),
    visitReason: formData.get("visitReason"),
    decisions: formData.getAll("decisions"),
  };

  // Validate
  const parsed = visitorSchema.safeParse(raw);

  if (!parsed.success) {
    return {
      success: false,
      errors: parsed.error.flatten().fieldErrors,
      message: "Por favor, corrija os erros no formulário.",
    };
  }

  const data = parsed.data;

  // Resolve group
  const routing = resolveGroup({
    fullName: data.fullName,
    phone: data.phone,
    neighborhood: data.neighborhood,
    city: data.city,
    maritalStatus: data.maritalStatus,
    birthDate: data.birthDate,
    visitReason: data.visitReason,
    decisions: data.decisions as any,
  });

  try {
    const { prisma } = await import("@/lib/prisma");

    const group = await prisma.group.findUnique({
      where: { name: routing.group },
    });

    if (!group) {
      throw new Error(`Grupo ${routing.group} não encontrado.`);
    }

    await prisma.visitor.create({
      data: {
        fullName: data.fullName,
        phone: data.phone,
        neighborhood: data.neighborhood,
        city: data.city,
        maritalStatus: data.maritalStatus,
        birthDate: new Date(data.birthDate),
        calculatedAge: routing.calculatedAge,
        visitReason: data.visitReason,
        decisions: JSON.stringify(data.decisions || []),
        groupId: group.id,
        status: "NOVO",
      },
    });

    console.log("[submitVisitor] Novo visitante salvo:", {
      ...data,
      group: routing.group,
      calculatedAge: routing.calculatedAge,
    });

    const firstName = data.fullName.trim().split(" ")[0];
    const targetUrl = `/obrigado?grupo=${encodeURIComponent(routing.group)}&nome=${encodeURIComponent(firstName)}`;
    redirect(targetUrl);
  } catch (error) {
    if (
      (error as any)?.message === "NEXT_REDIRECT" ||
      (error as any)?.digest?.startsWith("NEXT_REDIRECT")
    ) {
      throw error;
    }
    console.error("[submitVisitor] Erro:", error);
    return {
      success: false,
      message: "Ocorreu um erro ao salvar. Tente novamente.",
    };
  }
}
