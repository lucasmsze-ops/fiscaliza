import type { NextConfig } from "next";

const config: NextConfig = {
  // As páginas leem data/*.json em tempo de execução (ISR): os arquivos precisam ir junto
  // com as funções na Vercel. data/raw e data/sonda ficam de fora (não são lidos pelo site).
  outputFileTracingIncludes: { "/**": ["./data/*.json"] },
  outputFileTracingExcludes: { "/**": ["./data/raw/**", "./data/sonda/**", "./scripts/**", "./tests/**"] },
  // A Me representa virou parte da Visão geral (2026-11-13): ?uf= e ?cidade= seguem no redirecionamento.
  async redirects() {
    return [{ source: "/me-representa", destination: "/", permanent: true }];
  },
  async headers() {
    return [{ source: "/:path*", headers: [{ key: "Referrer-Policy", value: "same-origin" }] }];
  },
};

export default config;
