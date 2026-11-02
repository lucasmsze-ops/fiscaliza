/**
 * "Como cobrar" (E17, no lugar do botão Cobrar): o contato do gabinete e os canais oficiais onde
 * qualquer pessoa pode se manifestar. Sem texto pronto e sem formulário nosso. Cada endereço foi
 * aberto e conferido pelo título e pelo conteúdo da página oficial em `CANAIS_CONFERIDOS_EM`; ao
 * trocar um endereço, conferir de novo (páginas que respondem 200 podem dizer "não encontrada").
 */
import type { Casa } from "./types";

export const CANAIS_CONFERIDOS_EM = "2026-11-01";

export interface Canal {
  rotulo: string;
  /** Para que serve, em uma frase, segundo a própria página. */
  para: string;
  url: string;
}

/** Canal da Casa onde o político exerce o mandato. */
export const OUVIDORIA: Record<Casa, Canal> = {
  camara: {
    rotulo: "Ouvidoria da Câmara",
    para: "Reclamar, denunciar, sugerir ou elogiar à Câmara; a mensagem vai pelo Fale Conosco.",
    url: "https://www2.camara.leg.br/a-camara/estruturaadm/ouvidoria",
  },
  senado: {
    rotulo: "Ouvidoria do Senado",
    para: "Canal da população com o Senado para reclamações, denúncias, sugestões e elogios.",
    url: "https://www12.senado.leg.br/institucional/ouvidoria",
  },
};

/** Fora da Casa: dinheiro público federal e serviços do governo federal. */
export const CANAIS_EXTERNOS: Canal[] = [
  {
    rotulo: "Ouvidoria do TCU",
    para: "Relatar irregularidade de agente público envolvendo recursos federais.",
    url: "https://portal.tcu.gov.br/ouvidoria",
  },
  {
    rotulo: "MPF Serviços",
    para: "Fazer uma denúncia ao Ministério Público Federal, inclusive sem se identificar.",
    url: "https://www.mpf.mp.br/servicos",
  },
  {
    rotulo: "Fala.BR (CGU)",
    para: "Reclamar de um serviço da administração pública federal (não do mandato).",
    url: "https://falabr.cgu.gov.br",
  },
];
