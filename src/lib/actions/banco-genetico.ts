"use server";

import { revalidatePath } from "next/cache";
import { criarClienteServidor } from "@/lib/supabase/server";

function caminho(localId: string) {
  return `/${localId}/reproducao/banco-genetico`;
}

export type EstadoBancoGenetico = { erro?: string } | undefined;

export async function adicionarDosesSemen(
  _estadoAnterior: EstadoBancoGenetico,
  formData: FormData,
): Promise<EstadoBancoGenetico> {
  const localId = formData.get("localId") as string;
  const touroId = formData.get("touroId") as string;
  const quantidade = Number(formData.get("quantidade"));
  if (!touroId) return { erro: "Selecione o touro." };
  if (!Number.isInteger(quantidade) || quantidade < 1) return { erro: "Informe uma quantidade válida." };

  const observacoes = (formData.get("observacoes") as string)?.trim() || null;

  const supabase = await criarClienteServidor();
  const { error } = await supabase.rpc("adicionar_doses_semen", {
    p_local_id: localId,
    p_touro_id: touroId,
    p_quantidade: quantidade,
    p_observacoes: observacoes,
  });

  if (error) return { erro: "Não foi possível adicionar as doses: " + error.message };
  revalidatePath(caminho(localId));
  return {};
}

// Variante de chamada direta (sem FormData/useActionState) pra atalhos
// embutidos em outras telas, ex.: confirmar acasalamento sem sair pra
// cadastrar dose primeiro.
export async function adicionarDosesSemenDireto(
  localId: string,
  touroId: string,
  quantidade: number,
  observacoes: string | null,
) {
  const supabase = await criarClienteServidor();
  const { error } = await supabase.rpc("adicionar_doses_semen", {
    p_local_id: localId,
    p_touro_id: touroId,
    p_quantidade: quantidade,
    p_observacoes: observacoes,
  });
  if (error) throw new Error(error.message);
  revalidatePath(caminho(localId));
}

// Edita touro/quantidade/observações de um registro já existente — corrige
// erro de digitação sem precisar apagar e recriar (não existe "apagar
// registro de sêmen", só zerar quantidade).
export async function atualizarRegistroBancoSemen(
  localId: string,
  id: string,
  touroId: string,
  quantidadeDoses: number,
  observacoes: string | null,
) {
  const supabase = await criarClienteServidor();
  const { error } = await supabase.rpc("atualizar_registro_banco_semen", {
    p_id: id,
    p_touro_id: touroId,
    p_quantidade_doses: quantidadeDoses,
    p_observacoes: observacoes,
  });
  if (error) throw new Error(error.message);
  revalidatePath(caminho(localId));
}

export async function removerDosesSemen(localId: string, touroId: string, quantidade: number) {
  const supabase = await criarClienteServidor();
  const { error } = await supabase.rpc("remover_doses_semen", {
    p_local_id: localId,
    p_touro_id: touroId,
    p_quantidade: quantidade,
  });
  if (error) throw new Error(error.message);
  revalidatePath(caminho(localId));
}

export async function adicionarLoteEmbrioes(
  _estadoAnterior: EstadoBancoGenetico,
  formData: FormData,
): Promise<EstadoBancoGenetico> {
  const localId = formData.get("localId") as string;
  const doadoraId = formData.get("doadoraId") as string;
  const touroId = formData.get("touroId") as string;
  const especie = formData.get("especie") as string;
  const quantidade = Number(formData.get("quantidade"));
  if (!doadoraId) return { erro: "Selecione a doadora." };
  if (!touroId) return { erro: "Selecione o touro." };
  if (!Number.isInteger(quantidade) || quantidade < 1) return { erro: "Informe uma quantidade válida." };

  const dataProducao = (formData.get("dataProducao") as string) || null;
  const observacoes = (formData.get("observacoes") as string)?.trim() || null;

  const supabase = await criarClienteServidor();
  const { error } = await supabase.rpc("adicionar_lote_embrioes", {
    p_local_id: localId,
    p_doadora_id: doadoraId,
    p_touro_id: touroId,
    p_especie: especie,
    p_quantidade: quantidade,
    p_data_producao: dataProducao,
    p_observacoes: observacoes,
  });

  if (error) return { erro: "Não foi possível adicionar o lote: " + error.message };
  revalidatePath(caminho(localId));
  return {};
}

// Edita doadora/touro/quantidade/data/observações de um lote já existente —
// corrige erro de digitação sem afetar coberturas já confirmadas com esse
// lote (elas guardam femea_id/touro_id próprios, não ficam ligadas ao lote).
export async function atualizarLoteEmbrioes(
  localId: string,
  loteId: string,
  doadoraId: string,
  touroId: string,
  quantidade: number,
  dataProducao: string | null,
  observacoes: string | null,
) {
  const supabase = await criarClienteServidor();
  const { error } = await supabase.rpc("atualizar_lote_embrioes", {
    p_lote_id: loteId,
    p_doadora_id: doadoraId,
    p_touro_id: touroId,
    p_quantidade: quantidade,
    p_data_producao: dataProducao,
    p_observacoes: observacoes,
  });
  if (error) throw new Error(error.message);
  revalidatePath(caminho(localId));
}

export async function apagarLoteEmbrioes(localId: string, loteId: string) {
  const supabase = await criarClienteServidor();
  const { error } = await supabase.rpc("apagar_lote_embrioes", { p_lote_id: loteId });
  if (error) throw new Error(error.message);
  revalidatePath(caminho(localId));
}
