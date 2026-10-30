"use client";

import { useState, useTransition } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    const formData = new FormData(e.currentTarget);

    startTransition(async () => {
      const result = await signIn("credentials", {
        email: formData.get("email"),
        password: formData.get("password"),
        redirect: false,
      });

      if (result?.error) {
        setError("E-mail ou senha incorretos.");
      } else {
        router.push("/dashboard");
        router.refresh();
      }
    });
  }

  return (
    <main>
      <header className="hero-section" style={{ minHeight: "auto", paddingBottom: "2rem" }}>
        <div className="ic-logo-wrap">
          <img src="/logo-ic.png" alt="Igreja da Cidade Taubaté" className="ic-logo-img" />
          <div className="ic-logo-text">
            Igreja<br />da Cidade<br />Taubaté
          </div>
        </div>
        <h1 className="display-xl">
          ACESSO<span className="ic-asterisk">*</span>
        </h1>
        <p style={{ marginTop: "0.5rem", color: "rgba(255,255,255,0.6)", fontSize: "0.875rem" }}>
          Painel interno — líderes e coordenação
        </p>
      </header>

      <section className="form-section">
        <form onSubmit={handleSubmit} noValidate>
          {error && (
            <div style={{
              background: "#fff8f7",
              border: "1.5px solid var(--ic-red)",
              borderRadius: "var(--radius-md)",
              padding: "0.75rem 1rem",
              marginBottom: "1.25rem",
              fontSize: "0.85rem",
              color: "var(--ic-red)",
              fontWeight: 500,
            }}>
              {error}
            </div>
          )}

          <div className="form-group">
            <label className="form-label" htmlFor="email">Usuário</label>
            <input
              id="email"
              name="email"
              type="text"
              autoComplete="username"
              autoCapitalize="none"
              placeholder="Digite seu usuário"
              className="form-input"
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="password">Senha</label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              placeholder="••••••••"
              className="form-input"
              required
            />
          </div>

          <button
            type="submit"
            id="login-submit"
            className="btn-primary"
            disabled={isPending}
          >
            {isPending ? "Entrando..." : (
              <>Entrar <span className="btn-arrow">→</span></>
            )}
          </button>
        </form>
      </section>
    </main>
  );
}
