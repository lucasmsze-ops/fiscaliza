import type { Metadata, Viewport } from "next";
import { Rodape } from "@/components/Rodape";
import "./globals.css";

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
    <html lang="pt-BR">
      <body className="min-h-dvh antialiased">
        {children}
        <Rodape />
      </body>
    </html>
  );
}
