import { repo } from "@/lib/repo";

// E9: página mínima para provar o caminho JSON → Repo → página em produção.
// A entrada de verdade (cidade ou nome → colinha) é a E11.
export const revalidate = 86400;

export default async function Home() {
  const [kiko, municipios] = await Promise.all([repo.getPolitico("kiko-celeguim"), repo.listarMunicipios()]);
  const sp = (await repo.buscarPorCidade(3550308)).filter((e) => e.cargo === "deputado_federal");
  const primeiro = sp[0];
  return (
    <main className="mx-auto max-w-xl px-4 py-10">
      <h1 className="text-3xl font-bold tracking-tight">Fiscaliza</h1>
      <p className="mt-2 text-[var(--suave)]">Protótipo em construção. Dados oficiais de {municipios.length} municípios de SP.</p>
      {primeiro && (
        <p className="mt-8">
          Deputado federal mais votado na cidade de São Paulo em 2026:{" "}
          <strong>{primeiro.politico.nomeUrna}</strong> ({primeiro.politico.partido}), {primeiro.votos.toLocaleString("pt-BR")} votos.
        </p>
      )}
      {kiko && (
        <p className="mt-4 text-sm text-[var(--suave)]">
          Exemplo de registro: {kiko.nomeUrna}, {kiko.partido}-{kiko.uf}, status {kiko.status}.
        </p>
      )}
      <p className="mt-8 text-xs text-[var(--suave)]">Fonte: TSE, votação por município (2026).</p>
    </main>
  );
}
