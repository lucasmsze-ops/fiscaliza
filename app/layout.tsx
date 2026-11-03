import type { Metadata, Viewport } from "next";
import { Roboto } from "next/font/google";
import { Moldura } from "@/components/Moldura";
import "./globals.css";

// Baixada no build e servida pelo próprio site (next/font): nenhuma requisição ao Google na visita.
const roboto = Roboto({ subsets: ["latin"], weight: ["400", "500", "700"], display: "swap", variable: "--font-roboto" });

// URL absoluta para og:image (o WhatsApp não aceita relativa). Na Vercel vem da variável do projeto.
const SITE = process.env.NEXT_PUBLIC_SITE_URL
  ?? (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : "http://localhost:3107");

export const metadata: Metadata = {
  metadataBase: new URL(SITE),
  title: "Fiscaliza",
  description: "Em quem você votou, o que está fazendo e como cobrar. Dados oficiais do TSE, da Câmara e do Senado.",
  // Origem dos dados desta versão (diagnóstico; não aparece na tela): `json` ou `supabase` (lib/repo.ts).
  other: { "fiscaliza-dados": process.env.FISCALIZA_DADOS === "supabase" ? "supabase" : "json" },
};

export const viewport: Viewport = { width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={roboto.variable}>
      <body className="min-h-dvh font-sans antialiased">
        <Moldura>{children}</Moldura>
      </body>
    </html>
  );
}
