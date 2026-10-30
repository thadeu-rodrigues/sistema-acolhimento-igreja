import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://ictaubate.online"),
  title: "Bem-vindo | Igreja da Cidade Taubaté",
  description:
    "Que alegria ter você conosco! Uma igreja família para pertencer. Preencha seus dados para receber nosso contato.",
  authors: [{ name: "Thadeu Rodrigues", url: "https://www.linkedin.com/in/thadeu-rodrigues-46b055369/" }],
  creator: "Thadeu Rodrigues (https://www.linkedin.com/in/thadeu-rodrigues-46b055369/)",
  icons: {
    icon: "/logo-ic.png",
    apple: "/logo-ic.png",
  },
  openGraph: {
    title: "Bem-vindo à Igreja da Cidade Taubaté",
    description: "Uma família para pertencer. Que alegria ter você conosco em nosso culto! Toque para preencher seu contato.",
    url: "https://ictaubate.online",
    siteName: "Igreja da Cidade Taubaté",
    locale: "pt_BR",
    type: "website",
    images: [
      {
        url: "/og-image.jpg",
        width: 1200,
        height: 675,
        alt: "Igreja da Cidade Taubaté - Bem-vindo",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Bem-vindo à Igreja da Cidade Taubaté",
    description: "Uma família para pertencer. Que alegria ter você conosco em nosso culto!",
    images: ["/og-image.jpg"],
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
