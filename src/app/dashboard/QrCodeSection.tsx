"use client";

import { useState, useEffect } from "react";
import QRCode from "qrcode";

type Props = {
  compact?: boolean;
  onOpenModal?: () => void;
};

export default function QrCodeSection({ compact = false, onOpenModal }: Props) {
  const [origin, setOrigin] = useState<string>("");
  const [qrDataUrl, setQrDataUrl] = useState<string>("");
  const [copied, setCopied] = useState<boolean>(false);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setOrigin(window.location.origin);
    }
  }, []);

  const formUrl = origin ? `${origin}/` : "";

  useEffect(() => {
    if (!formUrl) return;

    QRCode.toDataURL(formUrl, {
      width: 480,
      margin: 2,
      color: {
        dark: "#0A0A0A",
        light: "#FFFFFF",
      },
      errorCorrectionLevel: "H",
    })
      .then((url) => setQrDataUrl(url))
      .catch((err) => console.error("Erro gerando QR Code:", err));
  }, [formUrl]);

  const handleCopyLink = async () => {
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

  const whatsappShareText = encodeURIComponent(
    `Olá! Seja muito bem-vindo(a) à Igreja da Cidade Taubaté! Por favor, preencha nosso formulário de acolhimento: ${formUrl}`
  );
  const whatsappShareUrl = `https://api.whatsapp.com/send?text=${whatsappShareText}`;

  // ── Versão Compacta (Para banner de topo em Visitantes/Métricas) ──
  if (compact) {
    return (
      <div
        style={{
          background: "linear-gradient(135deg, #111827 0%, #0A0A0A 100%)",
          color: "white",
          borderRadius: "14px",
          padding: "0.85rem 1rem",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: "0.75rem",
          boxShadow: "0 2px 8px rgba(0,0,0,0.12)",
          border: "1px solid rgba(255,255,255,0.08)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", minWidth: 0 }}>
          <div
            style={{
              width: "2.4rem",
              height: "2.4rem",
              borderRadius: "10px",
              background: "rgba(232,53,26,0.15)",
              border: "1px solid rgba(232,53,26,0.3)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "1.2rem",
              flexShrink: 0,
            }}
          >
            📱
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
              <span style={{ fontWeight: 800, fontSize: "0.85rem", letterSpacing: "-0.01em" }}>
                Formulário de Boas-Vindas
              </span>
              <span
                style={{
                  background: "rgba(34,197,94,0.15)",
                  color: "#4ade80",
                  fontSize: "0.62rem",
                  fontWeight: 700,
                  padding: "1px 6px",
                  borderRadius: "999px",
                }}
              >
                Ativo
              </span>
            </div>
            <div
              style={{
                fontSize: "0.72rem",
                color: "rgba(255,255,255,0.6)",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
                maxWidth: "240px",
              }}
              title={formUrl}
            >
              {formUrl || "Detectando endereço..."}
            </div>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", flexWrap: "wrap" }}>
          <button
            type="button"
            onClick={handleCopyLink}
            style={{
              background: copied ? "#16a34a" : "rgba(255,255,255,0.12)",
              color: "white",
              border: "1px solid rgba(255,255,255,0.15)",
              borderRadius: "8px",
              padding: "0.35rem 0.75rem",
              fontSize: "0.75rem",
              fontWeight: 600,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "0.35rem",
              transition: "all 0.2s ease",
            }}
          >
            {copied ? "✓ Copiado!" : "📋 Copiar Link"}
          </button>

          {onOpenModal && (
            <button
              type="button"
              onClick={onOpenModal}
              style={{
                background: "var(--ic-red, #E8351A)",
                color: "white",
                border: "none",
                borderRadius: "8px",
                padding: "0.35rem 0.75rem",
                fontSize: "0.75rem",
                fontWeight: 700,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "0.35rem",
              }}
            >
              🔍 Ver QR Code
            </button>
          )}
        </div>
      </div>
    );
  }

  // ── Versão Completa (Aba dedicada QR Code & Link) ──
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem", maxWidth: "800px", margin: "0 auto" }}>
      {/* Cabeçalho */}
      <div style={{ textAlign: "center", padding: "0.5rem 0" }}>
        <span
          style={{
            background: "rgba(232,53,26,0.1)",
            color: "var(--ic-red, #E8351A)",
            fontSize: "0.75rem",
            fontWeight: 800,
            padding: "3px 12px",
            borderRadius: "999px",
            textTransform: "uppercase",
            letterSpacing: "0.05em",
            display: "inline-block",
            marginBottom: "0.5rem",
          }}
        >
          Acolhimento & Recepção
        </span>
        <h2 style={{ fontSize: "1.5rem", fontWeight: 900, color: "#111827", margin: 0, letterSpacing: "-0.02em" }}>
          Link & QR Code do Formulário
        </h2>
        <p style={{ fontSize: "0.82rem", color: "#6b7280", margin: "0.35rem 0 0 0", maxWidth: "480px", marginInline: "auto" }}>
          Compartilhe com visitantes no culto de domingo, recepção presencial ou redes sociais.
        </p>
      </div>

      {/* Card Central com QR Code */}
      <div
        style={{
          background: "white",
          borderRadius: "20px",
          padding: "1.5rem 1.25rem",
          boxShadow: "0 4px 20px rgba(0,0,0,0.06)",
          border: "1px solid #f0f0f0",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          textAlign: "center",
        }}
      >
        {/* Caixa do QR Code com Borda Especial */}
        <div
          style={{
            position: "relative",
            background: "#ffffff",
            padding: "1rem",
            borderRadius: "16px",
            boxShadow: "0 8px 30px rgba(0,0,0,0.08)",
            border: "2px solid #f3f4f6",
            display: "inline-flex",
            flexDirection: "column",
            alignItems: "center",
          }}
        >
          {qrDataUrl ? (
            <img
              src={qrDataUrl}
              alt="QR Code do Formulário de Visitantes"
              style={{
                width: "260px",
                height: "260px",
                maxWidth: "75vw",
                maxHeight: "75vw",
                objectFit: "contain",
                display: "block",
                borderRadius: "8px",
              }}
            />
          ) : (
            <div
              style={{
                width: "260px",
                height: "260px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#9ca3af",
                fontSize: "0.85rem",
              }}
            >
              Gerando QR Code...
            </div>
          )}

          {/* Logo iC no rodapé do QR Code */}
          <div
            style={{
              marginTop: "0.5rem",
              display: "flex",
              alignItems: "center",
              gap: "0.35rem",
              color: "#374151",
              fontSize: "0.75rem",
              fontWeight: 700,
            }}
          >
            <img
              src="/logo-ic.png"
              alt="Logo IC"
              style={{
                width: "20px",
                height: "20px",
                borderRadius: "50%",
                objectFit: "contain",
                display: "block",
              }}
            />
            Igreja da Cidade Taubaté
          </div>
        </div>

        {/* Link Dinâmico */}
        <div style={{ width: "100%", maxWidth: "420px", marginTop: "1.25rem" }}>
          <div
            style={{
              background: "#f9fafb",
              border: "1.5px solid #e5e7eb",
              borderRadius: "12px",
              padding: "0.6rem 0.85rem",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "0.5rem",
            }}
          >
            <span
              style={{
                fontSize: "0.82rem",
                fontWeight: 600,
                color: "#111827",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
                direction: "ltr",
              }}
            >
              {formUrl || "Carregando..."}
            </span>

            <button
              id="copy-form-url-btn"
              type="button"
              onClick={handleCopyLink}
              style={{
                background: copied ? "#16a34a" : "#0A0A0A",
                color: "white",
                border: "none",
                borderRadius: "8px",
                padding: "0.4rem 0.75rem",
                fontSize: "0.75rem",
                fontWeight: 700,
                cursor: "pointer",
                whiteSpace: "nowrap",
                flexShrink: 0,
                transition: "all 0.2s ease",
              }}
            >
              {copied ? "✓ Copiado!" : "Copiar"}
            </button>
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "0.35rem",
              fontSize: "0.72rem",
              color: "#6b7280",
              marginTop: "0.5rem",
            }}
          >
            <span>🌐</span>
            <span>
              Ajustado automaticamente ao domínio acessado:{" "}
              <strong style={{ color: "#111827" }}>{origin || "..."}</strong>
            </span>
          </div>
        </div>

        {/* Grade de Botões de Ação */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
            gap: "0.65rem",
            width: "100%",
            maxWidth: "460px",
            marginTop: "1.25rem",
          }}
        >
          {/* Abrir Formulário */}
          <a
            id="open-form-newtab-btn"
            href={formUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              textDecoration: "none",
              background: "#ffffff",
              color: "#111827",
              border: "1.5px solid #d1d5db",
              borderRadius: "10px",
              padding: "0.6rem 0.8rem",
              fontSize: "0.78rem",
              fontWeight: 700,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "0.4rem",
              cursor: "pointer",
            }}
          >
            <span>↗</span> Abrir Página
          </a>

          {/* Baixar PNG */}
          {qrDataUrl && (
            <a
              id="download-qr-btn"
              href={qrDataUrl}
              download="qrcode-visitantes-ictaubate.png"
              style={{
                textDecoration: "none",
                background: "var(--ic-red, #E8351A)",
                color: "white",
                border: "none",
                borderRadius: "10px",
                padding: "0.6rem 0.8rem",
                fontSize: "0.78rem",
                fontWeight: 700,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "0.4rem",
                cursor: "pointer",
                boxShadow: "0 2px 8px rgba(232,53,26,0.25)",
              }}
            >
              <span>📥</span> Baixar Imagem
            </a>
          )}

          {/* Enviar WhatsApp */}
          <a
            id="share-whatsapp-btn"
            href={whatsappShareUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              textDecoration: "none",
              background: "#25D366",
              color: "white",
              border: "none",
              borderRadius: "10px",
              padding: "0.6rem 0.8rem",
              fontSize: "0.78rem",
              fontWeight: 700,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "0.4rem",
              cursor: "pointer",
            }}
          >
            <span>💬</span> WhatsApp
          </a>

          {/* Modo Apresentação / Tela Cheia */}
          <button
            type="button"
            id="fullscreen-qr-btn"
            onClick={() => setIsFullscreen(true)}
            style={{
              background: "#0A0A0A",
              color: "white",
              border: "none",
              borderRadius: "10px",
              padding: "0.6rem 0.8rem",
              fontSize: "0.78rem",
              fontWeight: 700,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "0.4rem",
              cursor: "pointer",
            }}
          >
            <span>📺</span> Modo Telão
          </button>
        </div>
      </div>

      {/* Modal Modo Telão (Full Screen) */}
      {isFullscreen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 99999,
            backgroundColor: "#0A0A0A",
            color: "white",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: "2rem",
            textAlign: "center",
          }}
        >
          <button
            type="button"
            onClick={() => setIsFullscreen(false)}
            style={{
              position: "absolute",
              top: "1.5rem",
              right: "1.5rem",
              background: "rgba(255,255,255,0.15)",
              color: "white",
              border: "none",
              borderRadius: "50%",
              width: "44px",
              height: "44px",
              fontSize: "1.3rem",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            ✕
          </button>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.6rem",
              marginBottom: "1.5rem",
            }}
          >
            <img
              src="/logo-ic.png"
              alt="Logo IC"
              style={{
                width: "2.8rem",
                height: "2.8rem",
                borderRadius: "50%",
                border: "2px solid rgba(255,255,255,0.9)",
                objectFit: "contain",
                display: "block",
              }}
            />
            <div style={{ textAlign: "left", lineHeight: 1.1 }}>
              <div style={{ fontSize: "0.75rem", textTransform: "uppercase", opacity: 0.8 }}>Igreja da Cidade</div>
              <div style={{ fontSize: "0.95rem", fontWeight: 800 }}>Taubaté</div>
            </div>
          </div>

          <h1
            style={{
              fontSize: "clamp(1.8rem, 5vw, 3rem)",
              fontWeight: 900,
              letterSpacing: "-0.02em",
              marginBottom: "0.5rem",
            }}
          >
            BEM-VINDO<span style={{ color: "var(--ic-red, #E8351A)" }}>*</span>
          </h1>

          <p
            style={{
              fontSize: "clamp(0.95rem, 2.5vw, 1.25rem)",
              color: "rgba(255,255,255,0.8)",
              maxWidth: "500px",
              marginBottom: "1.75rem",
            }}
          >
            Aponte a câmera do seu celular para preencher o formulário de acolhimento
          </p>

          <div
            style={{
              background: "white",
              padding: "1.5rem",
              borderRadius: "24px",
              boxShadow: "0 0 50px rgba(232,53,26,0.3)",
              display: "inline-block",
            }}
          >
            <img
              src={qrDataUrl}
              alt="QR Code Apresentação"
              style={{
                width: "min(340px, 65vw)",
                height: "min(340px, 65vw)",
                display: "block",
              }}
            />
          </div>

          <div
            style={{
              marginTop: "1.5rem",
              fontSize: "0.9rem",
              color: "rgba(255,255,255,0.7)",
              background: "rgba(255,255,255,0.08)",
              padding: "0.5rem 1.25rem",
              borderRadius: "999px",
            }}
          >
            {formUrl}
          </div>
        </div>
      )}
    </div>
  );
}
