"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";

type Props = {
  isOpen: boolean;
  onClose: () => void;
};

export default function QrCodeModal({ isOpen, onClose }: Props) {
  const [origin, setOrigin] = useState<string>("");
  const [qrDataUrl, setQrDataUrl] = useState<string>("");
  const [copied, setCopied] = useState<boolean>(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setOrigin(window.location.origin);
    }
  }, []);

  const formUrl = origin ? `${origin}/` : "";

  useEffect(() => {
    if (!formUrl || !isOpen) return;

    QRCode.toDataURL(formUrl, {
      width: 440,
      margin: 2,
      color: {
        dark: "#0A0A0A",
        light: "#FFFFFF",
      },
      errorCorrectionLevel: "H",
    })
      .then((url) => setQrDataUrl(url))
      .catch((err) => console.error(err));
  }, [formUrl, isOpen]);

  const handleCopy = async () => {
    if (!formUrl) return;
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(formUrl);
      } else {
        const input = document.createElement("input");
        input.value = formUrl;
        document.body.appendChild(input);
        input.select();
        document.execCommand("copy");
        document.body.removeChild(input);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      setCopied(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        backgroundColor: "rgba(0,0,0,0.75)",
        backdropFilter: "blur(6px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "1rem",
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          background: "white",
          borderRadius: "20px",
          maxWidth: "420px",
          width: "100%",
          padding: "1.5rem",
          boxShadow: "0 20px 40px rgba(0,0,0,0.3)",
          position: "relative",
          textAlign: "center",
          animation: "modalFadeIn 0.2s ease-out",
        }}
      >
        {/* Botão Fechar */}
        <button
          type="button"
          onClick={onClose}
          style={{
            position: "absolute",
            top: "1rem",
            right: "1rem",
            background: "#f3f4f6",
            border: "none",
            borderRadius: "50%",
            width: "32px",
            height: "32px",
            fontSize: "1rem",
            color: "#4b5563",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          ✕
        </button>

        {/* Cabeçalho do Modal */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "0.45rem", marginBottom: "0.4rem" }}>
          <img
            src="/logo-ic.png"
            alt="Logo IC"
            style={{
              width: "24px",
              height: "24px",
              borderRadius: "50%",
              objectFit: "contain",
              display: "block",
            }}
          />
          <span style={{ fontWeight: 800, fontSize: "0.85rem", color: "#111827", textTransform: "uppercase", letterSpacing: "0.02em" }}>
            Igreja da Cidade Taubaté
          </span>
        </div>

        <h3 style={{ fontSize: "1.2rem", fontWeight: 800, margin: "0 0 0.35rem 0", color: "#111827" }}>
          Formulário de Boas-Vindas
        </h3>
        <p style={{ fontSize: "0.75rem", color: "#6b7280", margin: "0 0 1rem 0" }}>
          Aponte a câmera para acessar ou compartilhe o link
        </p>

        {/* Caixa do QR Code */}
        <div
          style={{
            background: "#ffffff",
            padding: "0.75rem",
            borderRadius: "14px",
            border: "2px solid #f3f4f6",
            display: "inline-block",
            boxShadow: "0 4px 15px rgba(0,0,0,0.06)",
          }}
        >
          {qrDataUrl ? (
            <img
              src={qrDataUrl}
              alt="QR Code de Boas-Vindas"
              style={{
                width: "200px",
                height: "200px",
                display: "block",
                borderRadius: "6px",
              }}
            />
          ) : (
            <div style={{ width: "200px", height: "200px", display: "flex", alignItems: "center", justifyContent: "center", color: "#9ca3af" }}>
              Carregando...
            </div>
          )}
        </div>

        {/* Input com Link e Copiar */}
        <div
          style={{
            marginTop: "1rem",
            background: "#f9fafb",
            border: "1px solid #e5e7eb",
            borderRadius: "10px",
            padding: "0.45rem 0.65rem",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "0.5rem",
          }}
        >
          <span
            style={{
              fontSize: "0.78rem",
              fontWeight: 600,
              color: "#111827",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {formUrl || "..."}
          </span>
          <button
            type="button"
            onClick={handleCopy}
            style={{
              background: copied ? "#16a34a" : "#0A0A0A",
              color: "white",
              border: "none",
              borderRadius: "6px",
              padding: "0.3rem 0.65rem",
              fontSize: "0.72rem",
              fontWeight: 700,
              cursor: "pointer",
              whiteSpace: "nowrap",
              flexShrink: 0,
            }}
          >
            {copied ? "✓ Copiado!" : "Copiar"}
          </button>
        </div>

        {/* Botões extras */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem", marginTop: "0.85rem" }}>
          <a
            href={formUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              textDecoration: "none",
              background: "#ffffff",
              color: "#111827",
              border: "1px solid #d1d5db",
              borderRadius: "8px",
              padding: "0.5rem 0.6rem",
              fontSize: "0.75rem",
              fontWeight: 700,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "0.3rem",
            }}
          >
            ↗ Abrir Link
          </a>

          {qrDataUrl && (
            <a
              href={qrDataUrl}
              download="qrcode-visitantes-ictaubate.png"
              style={{
                textDecoration: "none",
                background: "var(--ic-red, #E8351A)",
                color: "white",
                border: "none",
                borderRadius: "8px",
                padding: "0.5rem 0.6rem",
                fontSize: "0.75rem",
                fontWeight: 700,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "0.3rem",
              }}
            >
              📥 Baixar Imagem
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
