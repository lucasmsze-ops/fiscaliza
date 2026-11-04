import { notFound, permanentRedirect } from "next/navigation";
import { idsDaUrl } from "@/lib/colinha";

// A colinha saiu da interface em 2026-11-04 (E23c). Links antigos já compartilhados vão para o
// crachá do primeiro político da colinha; quando a Comparar existir (E23f), os de mais de um vão para ela.
type Props = { params: Promise<{ ids: string }> };

export default async function ColinhaAntiga({ params }: Props) {
  const [primeiro] = idsDaUrl((await params).ids);
  if (!primeiro) notFound();
  permanentRedirect(`/p/${primeiro}`);
}
