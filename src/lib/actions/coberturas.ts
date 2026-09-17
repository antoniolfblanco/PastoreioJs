"use server";

import { revalidatePath } from "next/cache";
import { criarClienteServidor } from "@/lib/supabase/server";

function caminho(localId: string, eventoId: string) {
  return `/${localId}/reproducao/eventos/${eventoId}`;
}

// Adiciona fêmeas como participantes do evento, sem acasalamento definido
// ainda (fica pendente de "Confirmar acasalamento"). Não serve pra TE/FIV —
// lá a fêmea/doadora e o touro genético vêm do lote de embriões, e a
// cobertura já nasce confirmada (rotina ainda não construída aqui).
export async function adicionarParticipantesEvento(localId: string, eventoId: string, femeaIds: string[]) {
  const supabase = await criarClienteServidor();
  const { error } = await supabase.rpc("adicionar_participantes_evento", {
    p_evento_id: eventoId,
    p_femea_ids: femeaIds,
    p_receptora_ids: [],
  });
  if (error) throw new Error(error.message);
  revalidatePath(caminho(localId, eventoId));
}

// TE/FIV: participantes entram já confirmadas, com touro/doadora vindos do
// lote de embriões escolhido — desconta a quantidade do lote na hora.
export async function adicionarParticipantesEmbriao(
  localId: string,
  eventoId: string,
  params: { loteEmbriaoId: string; receptoraIds: string[]; data: string; responsavel: string | null },
) {
  const supabase = await criarClienteServidor();
  const { error } = await supabase.rpc("adicionar_participantes_embriao", {
    p_evento_id: eventoId,
    p_lote_embriao_id: params.loteEmbriaoId,
    p_receptora_ids: params.receptoraIds,
    p_data: params.data,
    p_responsavel: params.responsavel,
  });
  if (error) throw new Error(error.message);
  revalidatePath(caminho(localId, eventoId));
}

// Só funciona enquanto a cobertura não foi confirmada — RLS bloqueia depois
// disso (histórico confirmado é imutável).
export async function removerParticipante(localId: string, eventoId: string, coberturaId: string) {
  const supabase = await criarClienteServidor();
  const { error } = await supabase.from("coberturas").delete().eq("id", coberturaId);
  if (error) throw new Error(error.message);
  revalidatePath(caminho(localId, eventoId));
}

// Define quem efetivamente cobriu as fêmeas selecionadas — um touro
// conhecido (IA/monta natural com touro único) ou um lote RM (monta
// natural em grupo, touro exato desconhecido) — nunca os dois.
export async function confirmarAcasalamentos(
  localId: string,
  eventoId: string,
  params: { coberturaIds: string[]; touroId: string | null; rmLoteId: string | null; data: string; responsavel: string | null },
) {
  const supabase = await criarClienteServidor();
  const { error } = await supabase.rpc("confirmar_acasalamentos", {
    p_cobertura_ids: params.coberturaIds,
    p_touro_id: params.touroId,
    p_rm_lote_id: params.rmLoteId,
    p_data: params.data,
    p_responsavel: params.responsavel,
  });
  if (error) throw new Error(error.message);
  revalidatePath(caminho(localId, eventoId));
}

export async function registrarDiagnosticosGestacao(
  localId: string,
  eventoId: string,
  params: {
    resultados: { coberturaId: string; resultado: string; certeza: string | null }[];
    data: string;
    responsavel: string | null;
    observacoes: string | null;
  },
) {
  const supabase = await criarClienteServidor();
  const { error } = await supabase.rpc("registrar_diagnosticos_gestacao", {
    p_cobertura_ids: params.resultados.map((r) => r.coberturaId),
    p_resultados: params.resultados.map((r) => r.resultado),
    p_certezas: params.resultados.map((r) => r.certeza),
    p_data: params.data,
    p_responsavel: params.responsavel,
    p_observacoes: params.observacoes,
  });
  if (error) throw new Error(error.message);
  revalidatePath(caminho(localId, eventoId));
}
