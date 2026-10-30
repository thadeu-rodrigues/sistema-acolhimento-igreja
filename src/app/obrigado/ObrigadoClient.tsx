"use client";

import { useSearchParams } from "next/navigation";
import Link from "next/link";

export default function ObrigadoClient() {
  const searchParams = useSearchParams();
  const nomeParam = searchParams.get("nome") || "";

  return (
    <main
      style={{
        minHeight: "100dvh",
        backgroundColor: "var(--ic-black, #0A0A0A)",
        color: "#ffffff",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "2.5rem 1.25rem",
        textAlign: "center",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Background Glow */}
      <div
        style={{
          position: "absolute",
          top: "-15%",
          left: "50%",
          transform: "translateX(-50%)",
          width: "400px",
          height: "400px",
          background:
            "radial-gradient(circle, rgba(232,53,26,0.18) 0%, rgba(10,10,10,0) 70%)",
          pointerEvents: "none",
        }}
      />

      {/* Header / Logo */}
      <div className="ic-logo-wrap" style={{ marginBottom: "1.5rem" }}>
        <img src="/logo-ic.png" alt="Igreja da Cidade Taubaté" className="ic-logo-img" />
        <div className="ic-logo-text">
          Igreja<br />da Cidade<br />Taubaté
        </div>
      </div>

      {/* Ícone de Sucesso */}
      <div
        className="success-icon"
        style={{
          boxShadow: "0 0 30px rgba(232,53,26,0.3)",
          marginBottom: "1rem",
        }}
      >
        ✓
      </div>


      <h1
        className="display-lg"
        style={{
          fontSize: "clamp(2.5rem, 8vw, 3.5rem)",
          lineHeight: 1,
          marginBottom: "0.75rem",
        }}
      >
        OBRIGADO<span className="ic-asterisk">*</span>
      </h1>

      {nomeParam ? (
        <p
          style={{
            fontSize: "1.2rem",
            fontWeight: 700,
            color: "#fff",
            marginBottom: "0.5rem",
          }}
        >
          Olá, <span style={{ color: "var(--ic-red, #E8351A)" }}>{nomeParam}</span>!
        </p>
      ) : null}

      <p
        style={{
          color: "rgba(255,255,255,0.85)",
          maxWidth: "340px",
          fontSize: "1.05rem",
          lineHeight: 1.6,
          marginBottom: "0.75rem",
        }}
      >
        Ficamos muito felizes com a sua visita! Que alegria ter você conosco na
        Igreja da Cidade Taubaté.
      </p>

      <p
        style={{
          color: "#9ca3af",
          maxWidth: "340px",
          fontSize: "0.875rem",
          lineHeight: 1.5,
          marginBottom: "2rem",
        }}
      >
        Nossa equipe de acolhimento entrará em contato em breve pelo seu WhatsApp!
      </p>

      {/* Botões de Ação */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "0.85rem",
          width: "100%",
          maxWidth: "340px",
        }}
      >
        {/* Botão Instagram Oficial @ic.taubate */}
        <a
          id="link-instagram-ictaubate"
          href="https://www.instagram.com/ic.taubate"
          target="_blank"
          rel="noopener noreferrer"
          style={{
            textDecoration: "none",
            background:
              "linear-gradient(45deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%)",
            color: "#ffffff",
            padding: "0.85rem 1.5rem",
            borderRadius: "999px",
            fontSize: "0.95rem",
            fontWeight: 700,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "0.5rem",
            boxShadow: "0 4px 15px rgba(220,39,67,0.3)",
          }}
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect>
            <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
            <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line>
          </svg>
          Siga @ic.taubate no Instagram ↗
        </a>

        <Link
          href="/"
          className="btn-primary"
          style={{
            textDecoration: "none",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            background: "#262626",
            border: "1px solid rgba(255,255,255,0.15)",
          }}
        >
          Voltar ao Início
        </Link>
      </div>
    </main>
  );
}
