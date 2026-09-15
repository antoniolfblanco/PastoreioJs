"use server";

import { revalidatePath } from "next/cache";
import { criarClienteServidor } from "@/lib/supabase/server";

export type EstadoConsumo = { erro?: string } | undefined;

function caminho(localId: string) {
  return `/${localId}/ocorrencias/consumo`;
}

export async function registrarConsumo(
  _estadoAnterior: EstadoConsumo,
  formData: FormData,
): Promise<EstadoConsumo> {
  const localId = formData.get("localId") as string;
  const animalIds = JSON.parse((formData.get("animalIds") as string) || "[]") as string[];
  if (animalIds.length === 0) return { erro: "Selecione ao menos um animal." };

  const data = formData.get("data") as string;
  const pesoVivoTexto = formData.get("pesoVivo") as string;
  const pesoCarneTexto = formData.get("pesoCarne") as string;
  const destino = (formData.get("destino") as string)?.trim() || null;
  const observacoes = (formData.get("observacoes") as string)?.trim() || null;
  const responsavel = (formData.get("responsavel") as string)?.trim() || null;
  const descricao = (formData.get("descricao") as string)?.trim() || null;
  const valorAtualTexto = formData.get("valorAtual") as string;

  const supabase = await criarClienteServidor();
  const { error } = await supabase.rpc("registrar_consumo", {
    p_animal_ids: animalIds,
    p_peso_vivo: pesoVivoTexto ? Number(pesoVivoTexto) : null,
    p_peso_carne: pesoCarneTexto ? Number(pesoCarneTexto) : null,
    p_destino: destino,
    p_observacoes: observacoes,
    p_responsavel: responsavel,
    p_data: data,
    p_descricao: descricao,
    p_valor_atual: valorAtualTexto ? Number(valorAtualTexto) : null,
  });

  if (error) return { erro: "Não foi possível registrar: " + error.message };

  revalidatePath(caminho(localId));
  return {};
}

export async function atualizarConsumo(
  _estadoAnterior: EstadoConsumo,
  formData: FormData,
): Promise<EstadoConsumo> {
  const localId = formData.get("localId") as string;
  const grupoId = formData.get("grupoId") as string;
  const data = formData.get("data") as string;
  const pesoVivoTexto = formData.get("pesoVivo") as string;
  const pesoCarneTexto = formData.get("pesoCarne") as string;
  const destino = (formData.get("destino") as string)?.trim() || null;
  const observacoes = (formData.get("observacoes") as string)?.trim() || null;
  const responsavel = (formData.get("responsavel") as string)?.trim() || null;
  const descricao = (formData.get("descricao") as string)?.trim() || null;

  const supabase = await criarClienteServidor();
  const { error } = await supabase.rpc("atualizar_consumo", {
    p_grupo_id: grupoId,
    p_data: data,
    p_peso_vivo: pesoVivoTexto ? Number(pesoVivoTexto) : null,
    p_peso_carne: pesoCarneTexto ? Number(pesoCarneTexto) : null,
    p_destino: destino,
    p_observacoes: observacoes,
    p_responsavel: responsavel,
    p_descricao: descricao,
  });

  if (error) return { erro: "Não foi possível salvar: " + error.message };

  revalidatePath(caminho(localId));
  return {};
}

// Só desfaz o registro de consumo mais recente do local — mesma regra de
// Mortes, é o que a RPC do banco faz.
export async function desfazerUltimoConsumo(localId: string) {
  const supabase = await criarClienteServidor();
  const { error } = await supabase.rpc("desfazer_ultimo_consumo", { p_local_id: localId });
  if (error) throw new Error(error.message);
  revalidatePath(caminho(localId));
}
