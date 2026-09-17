import { Suspense } from "react";
import type { Metadata } from "next";
import ObrigadoClient from "./ObrigadoClient";

export const metadata: Metadata = {
  title: "Obrigado | Igreja da Cidade Taubaté",
  description: "Que alegria ter você conosco! Seja muito bem-vindo à IC Taubaté.",
};

export default function ObrigadoPage() {
  return (
    <Suspense
      fallback={
        <div
          style={{
            minHeight: "100dvh",
            backgroundColor: "#0A0A0A",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#fff",
          }}
        >
          Carregando...
        </div>
      }
    >
      <ObrigadoClient />
    </Suspense>
  );
}
