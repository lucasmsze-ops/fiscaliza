import type { Metadata, Viewport } from "next";
import { Inter_Tight } from "next/font/google";
import { Moldura } from "@/components/Moldura";
import "./globals.css";

// Marca e título do Início (protótipo Liquid Glass). next/font baixa no build e o site serve o arquivo: nada é
// buscado no Google quando a pessoa abre a página.
const display = Inter_Tight({ subsets: ["latin"], weight: ["700"], variable: "--fonte-display", display: "swap" });

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

// Sempre escuro: controles nativos e a barra do navegador (Safari, Chrome no celular) no grafite do fundo.
export const viewport: Viewport = { width: "device-width", initialScale: 1, colorScheme: "dark", themeColor: "#17181d" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={display.variable}>
      <body className="min-h-dvh font-sans antialiased">
        <Moldura>{children}</Moldura>
      </body>
    </html>
  );
}
