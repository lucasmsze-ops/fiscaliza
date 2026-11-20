"""
Planos de governo dos eleitos de 2026 (E23n): extrai do zip do TSE só os PDFs de cada eleito e grava o índice
`data/planos/2026.json`; os PDFs vão para a release `planos-2026` do GitHub (decisão do usuário de 2026-11-20:
custo zero, fora do repositório).

O zip `proposta_governo_2026_{UF|BR}.zip` traz todos os candidatos do estado (até 20 MB); o servidor do TSE
aceita `Range`, então o script lê o índice do zip e só os arquivos do eleito, sem baixar o resto. Roda uma vez
por eleição (os planos registrados não mudam). Script de manutenção, não do cron: Python da biblioteca padrão,
com `curl` para o HTTP (o Python do macOS não acha os certificados).

Uso (na raiz do repositório, com o estado do cron em estado/):
    python3 -I scripts/tse/planos.py <pasta de saída dos PDFs>
    gh release create planos-2026 --title "Planos de governo 2026" --notes "..." <pasta>/*.pdf
"""
import io
import json
import re
import subprocess
import sys
import zipfile
from pathlib import Path

ZIP = "https://cdn.tse.jus.br/estatistica/sead/odsele/proposta_governo/proposta_governo_2026_{uf}.zip"
RELEASE = "https://github.com/lucasmsze-ops/fiscaliza/releases/download/planos-2026/{nome}"


class Remoto(io.RawIOBase):
    """Arquivo remoto lido por pedaços (HTTP Range), para o zipfile abrir sem baixar tudo."""

    def __init__(self, url: str):
        self.url, self.pos = url, 0
        cab = subprocess.run(["curl", "-sfI", url], capture_output=True, text=True, check=True).stdout
        self.size = int(re.search(r"content-length: (\d+)", cab, re.I).group(1))

    def seekable(self): return True
    def readable(self): return True
    def tell(self): return self.pos

    def seek(self, o, w=0):
        self.pos = o if w == 0 else self.pos + o if w == 1 else self.size + o
        return self.pos

    def read(self, n=-1):
        n = self.size - self.pos if n < 0 else min(n, self.size - self.pos)
        if n <= 0:
            return b""
        r = subprocess.run(["curl", "-sf", "-r", f"{self.pos}-{self.pos + n - 1}", self.url], capture_output=True, check=True).stdout
        self.pos += len(r)
        return r

    def readinto(self, b):
        d = self.read(len(b))
        b[: len(d)] = d
        return len(d)


def main(saida: Path):
    saida.mkdir(parents=True, exist_ok=True)
    executivos = json.loads(Path("estado/dados/executivos.json").read_text())
    zips: dict[str, zipfile.ZipFile] = {}
    indice: dict[str, list[dict]] = {}
    for e in sorted(executivos, key=lambda x: (x["cargo"] != "presidente", x["uf"] or "")):
        uf = "BR" if e["cargo"] == "presidente" else e["uf"]
        if uf not in zips:
            zips[uf] = zipfile.ZipFile(io.BufferedReader(Remoto(ZIP.format(uf=uf)), buffer_size=1 << 16))
        padrao = re.compile(rf"^{uf}/2026{uf}{e['tse_sq_candidato']}_(\d+)\.pdf$")
        arquivos = sorted((i for i in zips[uf].infolist() if padrao.match(i.filename)), key=lambda i: i.filename)
        if not arquivos:
            print(f"{uf} {e['nome_urna']}: sem PDF no zip do TSE", file=sys.stderr)
        for i in arquivos:
            nome = Path(i.filename).name
            (saida / nome).write_bytes(zips[uf].read(i))
            indice.setdefault(str(e["tse_sq_candidato"]), []).append({"nome": nome, "bytes": i.file_size, "url": RELEASE.format(nome=nome)})
            print(f"{uf} {e['nome_urna']}: {nome} ({i.file_size / 1e6:.1f} MB)")
    destino = Path("data/planos/2026.json")
    destino.parent.mkdir(parents=True, exist_ok=True)
    destino.write_text(json.dumps({
        "_sobre": "PDFs dos planos de governo dos eleitos de 2026, extraídos dos zips do TSE (proposta_governo_2026_{UF}.zip) "
                  "por scripts/tse/planos.py e publicados na release planos-2026 do GitHub. Chave: SQ do candidato no TSE.",
        "zip": ZIP,
        "planos": indice,
    }, ensure_ascii=False, indent=1) + "\n")
    print(f"{sum(len(v) for v in indice.values())} PDFs de {len(indice)} eleitos; índice em {destino}")


if __name__ == "__main__":
    main(Path(sys.argv[1]))
