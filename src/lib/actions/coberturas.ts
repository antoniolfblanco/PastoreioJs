"use server";

import { revalidatePath } from "next/cache";
import { criarClienteServidor } from "@/lib/supabase/server";

// Erros esperados (regra de negócio da RPC, ex.: "não há doses
// suficientes") viram valor de retorno, nunca throw — o Next.js redige
// qualquer erro lançado (throw) de uma Server Function em produção, só
// mostra o texto real em dev. Com throw, o usuário via só um "React error
// #441" genérico em vez da mensagem de verdade.
export type ResultadoAcao = { error?: string };

function caminho(localId: string, eventoId: string) {
  return `/${localId}/reproducao/eventos/${eventoId}`;
}

// Adiciona fêmeas como participantes do evento, sem acasalamento definido
// ainda (fica pendente de "Confirmar acasalamento"). Não serve pra TE/FIV —
// lá a fêmea/doadora e o touro genético vêm do lote de embriões, e a
// cobertura já nasce confirmada (rotina ainda não construída aqui).
export async function adicionarParticipantesEvento(
  localId: string,
  eventoId: string,
  femeaIds: string[],
): Promise<ResultadoAcao> {
  const supabase = await criarClienteServidor();
  const { error } = await supabase.rpc("adicionar_participantes_evento", {
    p_evento_id: eventoId,
    p_femea_ids: femeaIds,
    p_receptora_ids: [],
  });
  if (error) return { error: error.message };
  revalidatePath(caminho(localId, eventoId));
  return {};
}

// TE/FIV, etapa 1: só escolhe as receptoras — doadora/touro ficam em aberto
// até "confirmar acasalamento" escolher o lote de embriões (mesma lógica de
// pendência que adicionarParticipantesEvento usa pra IA/monta natural).
export async function adicionarReceptorasEvento(
  localId: string,
  eventoId: string,
  receptoraIds: string[],
): Promise<ResultadoAcao> {
  const supabase = await criarClienteServidor();
  const { error } = await supabase.rpc("adicionar_receptoras_evento", {
    p_evento_id: eventoId,
    p_receptora_ids: receptoraIds,
  });
  if (error) return { error: error.message };
  revalidatePath(caminho(localId, eventoId));
  return {};
}

// TE/FIV, etapa 2: escolhe o lote de embriões (doadora × touro) pras
// coberturas pendentes selecionadas — preenche femea_id/touro_id de uma vez
// e desconta a quantidade do lote. Análogo ao confirmarAcasalamentos da IA.
export async function confirmarAcasalamentoEmbriao(
  localId: string,
  eventoId: string,
  params: { coberturaIds: string[]; loteEmbriaoId: string; data: string; responsavel: string | null },
): Promise<ResultadoAcao> {
  const supabase = await criarClienteServidor();
  const { error } = await supabase.rpc("confirmar_acasalamento_embriao", {
    p_cobertura_ids: params.coberturaIds,
    p_lote_embriao_id: params.loteEmbriaoId,
    p_data: params.data,
    p_responsavel: params.responsavel,
  });
  if (error) return { error: error.message };
  revalidatePath(caminho(localId, eventoId));
  return {};
}

// Só funciona enquanto a cobertura não foi confirmada — RLS bloqueia depois
// disso (histórico confirmado é imutável).
export async function removerParticipante(
  localId: string,
  eventoId: string,
  coberturaId: string,
): Promise<ResultadoAcao> {
  const supabase = await criarClienteServidor();
  const { error } = await supabase.from("coberturas").delete().eq("id", coberturaId);
  if (error) return { error: error.message };
  revalidatePath(caminho(localId, eventoId));
  return {};
}

// Define quem efetivamente cobriu as fêmeas selecionadas — um touro
// conhecido (IA/monta natural com touro único) ou um lote RM (monta
// natural em grupo, touro exato desconhecido) — nunca os dois.
export async function confirmarAcasalamentos(
  localId: string,
  eventoId: string,
  params: { coberturaIds: string[]; touroId: string | null; rmLoteId: string | null; data: string; responsavel: string | null },
): Promise<ResultadoAcao> {
  const supabase = await criarClienteServidor();
  const { error } = await supabase.rpc("confirmar_acasalamentos", {
    p_cobertura_ids: params.coberturaIds,
    p_touro_id: params.touroId,
    p_rm_lote_id: params.rmLoteId,
    p_data: params.data,
    p_responsavel: params.responsavel,
  });
  if (error) return { error: error.message };
  revalidatePath(caminho(localId, eventoId));
  return {};
}

// Reverte uma confirmação (volta pra "pendente"). A RPC recusa se já tiver
// diagnóstico ou nascido registrado, e devolve a dose de sêmen se o método
// for inseminação artificial.
export async function desfazerAcasalamento(
  localId: string,
  eventoId: string,
  coberturaId: string,
): Promise<ResultadoAcao> {
  const supabase = await criarClienteServidor();
  const { error } = await supabase.rpc("desfazer_confirmacao_acasalamento", { p_cobertura_id: coberturaId });
  if (error) return { error: error.message };
  revalidatePath(caminho(localId, eventoId));
  return {};
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
): Promise<ResultadoAcao> {
  const supabase = await criarClienteServidor();
  const { error } = await supabase.rpc("registrar_diagnosticos_gestacao", {
    p_cobertura_ids: params.resultados.map((r) => r.coberturaId),
    p_resultados: params.resultados.map((r) => r.resultado),
    p_certezas: params.resultados.map((r) => r.certeza),
    p_data: params.data,
    p_responsavel: params.responsavel,
    p_observacoes: params.observacoes,
  });
  if (error) return { error: error.message };
  revalidatePath(caminho(localId, eventoId));
  return {};
}
