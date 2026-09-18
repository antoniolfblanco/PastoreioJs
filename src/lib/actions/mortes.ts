"use server";

import { revalidatePath } from "next/cache";
import { criarClienteServidor } from "@/lib/supabase/server";

export type EstadoMorte = { erro?: string } | undefined;

function caminho(localId: string) {
  return `/${localId}/ocorrencias/mortes`;
}

export async function registrarMorte(
  _estadoAnterior: EstadoMorte,
  formData: FormData,
): Promise<EstadoMorte> {
  const localId = formData.get("localId") as string;
  const animalIds = JSON.parse((formData.get("animalIds") as string) || "[]") as string[];
  if (animalIds.length === 0) return { erro: "Selecione ao menos um animal." };

  const data = formData.get("data") as string;
  const enfermidadeId = (formData.get("enfermidadeId") as string) || null;
  const tratada = formData.get("tratada") === "on";
  const observacoes = (formData.get("observacoes") as string)?.trim() || null;
  const responsavel = (formData.get("responsavel") as string)?.trim() || null;
  const descricao = (formData.get("descricao") as string)?.trim() || null;
  const valorAtualTexto = formData.get("valorAtual") as string;
  const valorAtual = valorAtualTexto ? Number(valorAtualTexto) : null;

  const supabase = await criarClienteServidor();
  const { error } = await supabase.rpc("registrar_morte", {
    p_animal_ids: animalIds,
    p_enfermidade_id: enfermidadeId,
    p_tratada: tratada,
    p_observacoes: observacoes,
    p_responsavel: responsavel,
    p_data: data,
    p_descricao: descricao,
    p_valor_atual: valorAtual,
  });

  if (error) return { erro: "Não foi possível registrar: " + error.message };

  revalidatePath(caminho(localId));
  return {};
}

export async function atualizarMorte(
  _estadoAnterior: EstadoMorte,
  formData: FormData,
): Promise<EstadoMorte> {
  const localId = formData.get("localId") as string;
  const grupoId = formData.get("grupoId") as string;
  const data = formData.get("data") as string;
  const enfermidadeId = (formData.get("enfermidadeId") as string) || null;
  const tratada = formData.get("tratada") === "on";
  const observacoes = (formData.get("observacoes") as string)?.trim() || null;
  const responsavel = (formData.get("responsavel") as string)?.trim() || null;
  const descricao = (formData.get("descricao") as string)?.trim() || null;

  const supabase = await criarClienteServidor();
  const { error } = await supabase.rpc("atualizar_morte", {
    p_grupo_id: grupoId,
    p_data: data,
    p_enfermidade_id: enfermidadeId,
    p_tratada: tratada,
    p_observacoes: observacoes,
    p_responsavel: responsavel,
    p_descricao: descricao,
  });

  if (error) return { erro: "Não foi possível salvar: " + error.message };

  revalidatePath(caminho(localId));
  return {};
}

// Erros esperados (regra de negócio da RPC) viram valor de retorno, nunca
// throw — o Next.js redige qualquer erro lançado (throw) de uma Server
// Function em produção, só mostra o texto real em dev.
export type ResultadoAcao = { error?: string };

// Só desfaz o registro de morte mais recente do local (é o que a RPC faz —
// não existe "desfazer" um grupo específico do meio da lista).
export async function desfazerUltimaMorte(localId: string): Promise<ResultadoAcao> {
  const supabase = await criarClienteServidor();
  const { error } = await supabase.rpc("desfazer_ultima_morte", { p_local_id: localId });
  if (error) return { error: error.message };
  revalidatePath(caminho(localId));
  return {};
}

export type EstadoEnfermidade = { erro?: string; id?: string } | undefined;

export async function salvarEnfermidade(
  _estadoAnterior: EstadoEnfermidade,
  formData: FormData,
): Promise<EstadoEnfermidade> {
  const localId = formData.get("localId") as string;
  const descricao = (formData.get("descricao") as string)?.trim();
  if (!descricao) return { erro: "Informe o nome da enfermidade." };

  const supabase = await criarClienteServidor();
  const { data, error } = await supabase
    .from("enfermidades")
    .insert({ local_id: localId, descricao })
    .select("id")
    .single();

  if (error) return { erro: "Não foi possível criar: " + error.message };
  return { id: data.id };
}
