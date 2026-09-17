import type { Metadata } from "next";
import VisitorForm from "@/app/components/VisitorForm";

export const metadata: Metadata = {
  title: "Bem-vindo | Igreja da Cidade Taubaté",
  description:
    "Nos conte um pouco sobre você! Preencha o formulário e nossa equipe de acolhimento da IC Taubaté entrará em contato.",
};

export default function HomePage() {
  return <VisitorForm />;
}
