"use client";

/**
 * O santinho do "Quem votei", só neste navegador (CLAUDE.md, princípio 3): localStorage, nunca vai para
 * o servidor. Mesmo desenho de lib/monitorando.ts. Ao escolher alguém eleito, ele entra também no
 * Monitorando; ao tirar do santinho, continua monitorado (decisão do usuário de 2026-11-19).
 */
import { useSyncExternalStore } from "react";
import { garantir } from "./monitorando";
import { CARGOS, type AnoEleicao, type CargoSantinho, type Escolha, type Santinho } from "./quem-votei";

const CHAVE = "fiscaliza:quem-votei:v1";
const EVENTO = "fiscaliza:quem-votei";
type Estado = Partial<Record<AnoEleicao, Santinho>>;
const VAZIO: Estado = {};
export const SANTINHO_VAZIO: Santinho = { uf: null, escolhas: {} };

let cache: { texto: string | null; valor: Estado } = { texto: null, valor: VAZIO };

function ler(): Estado {
  let texto: string | null = null;
  try { texto = window.localStorage.getItem(CHAVE); } catch { return cache.valor; }
  if (texto === cache.texto) return cache.valor;
  let valor: Estado = VAZIO;
  try {
    const j = texto ? JSON.parse(texto) as Estado : null;
    if (j && typeof j === "object") valor = j;
  } catch { /* texto corrompido: começa vazio */ }
  cache = { texto, valor };
  return valor;
}

function gravar(f: (e: Estado) => Estado) {
  const novo = f(ler());
  const texto = JSON.stringify(novo);
  try { window.localStorage.setItem(CHAVE, texto); } catch { /* sem armazenamento: vale só nesta página */ }
  cache = { texto, valor: novo };
  window.dispatchEvent(new Event(EVENTO));
}

function assinar(aviso: () => void) {
  const noStorage = (e: StorageEvent) => { if (e.key === CHAVE) aviso(); };
  window.addEventListener("storage", noStorage);
  window.addEventListener(EVENTO, aviso);
  return () => { window.removeEventListener("storage", noStorage); window.removeEventListener(EVENTO, aviso); };
}

export function useSantinho(ano: AnoEleicao): Santinho {
  const e = useSyncExternalStore(assinar, ler, () => VAZIO);
  return e[ano] ?? SANTINHO_VAZIO;
}

const mudar = (ano: AnoEleicao, f: (s: Santinho) => Santinho) => gravar((e) => ({ ...e, [ano]: f(e[ano] ?? SANTINHO_VAZIO) }));

export const definirUf = (ano: AnoEleicao, uf: string | null) => mudar(ano, (s) => ({ ...s, uf }));

/** Escolhe alguém para o cargo: nos cargos de uma vaga, troca; no Senado (2 vagas), o terceiro substitui o mais antigo. */
export function escolher(ano: AnoEleicao, cargo: CargoSantinho, x: Escolha) {
  const vagas = CARGOS.find((c) => c.chave === cargo)!.vagas;
  mudar(ano, (s) => {
    const atuais = (s.escolhas[cargo] ?? []).filter((y) => y.id !== x.id);
    return { ...s, escolhas: { ...s.escolhas, [cargo]: [...atuais, x].slice(-vagas) } };
  });
  if (x.eleito) garantir(x.id, x.nome);
}

export const tirar = (ano: AnoEleicao, cargo: CargoSantinho, id: string) =>
  mudar(ano, (s) => ({ ...s, escolhas: { ...s.escolhas, [cargo]: (s.escolhas[cargo] ?? []).filter((y) => y.id !== id) } }));
