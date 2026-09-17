import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Bem-vindo | Igreja da Cidade Taubaté",
  description:
    "Preencha o formulário de visitante e nossa equipe de acolhimento entrará em contato com você.",
  icons: {
    icon: "/logo-ic.png",
    apple: "/logo-ic.png",
  },
  openGraph: {
    title: "Bem-vindo | Igreja da Cidade Taubaté",
    description: "Uma igreja em muitos lugares. Preencha o formulário e faça parte da família IC.",
    locale: "pt_BR",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
        <meta name="theme-color" content="#0A0A0A" />
        <link rel="icon" href="/logo-ic.png" type="image/png" />
        <link rel="apple-touch-icon" href="/logo-ic.png" />
        <link rel="manifest" href="/manifest.json" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:ital,wght@0,400;0,600;0,700;0,800;0,900;1,700&family=Inter:wght@300;400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
