"use server";

import { revalidatePath } from "next/cache";
import { criarClienteServidor } from "@/lib/supabase/server";

export type EstadoManejo = { erro?: string } | undefined;

function caminho(localId: string) {
  return `/${localId}/manejos/sanitarios`;
}

export async function registrarManejoSanitario(
  _estadoAnterior: EstadoManejo,
  formData: FormData,
): Promise<EstadoManejo> {
  const localId = formData.get("localId") as string;
  const animalIds = JSON.parse((formData.get("animalIds") as string) || "[]") as string[];
  const medicamentoIds = JSON.parse((formData.get("medicamentoIds") as string) || "[]") as string[];
  const areaId = formData.get("areaId") as string;
  const especie = formData.get("especie") as string;

  if (animalIds.length === 0) return { erro: "Selecione ao menos um animal." };
  if (!areaId) return { erro: "Selecione a área." };

  const data = formData.get("data") as string;
  const responsavel = (formData.get("responsavel") as string)?.trim() || null;
  const observacoes = (formData.get("observacoes") as string)?.trim() || null;
  const descricao = (formData.get("descricao") as string)?.trim() || null;

  const supabase = await criarClienteServidor();
  const { error } = await supabase.rpc("registrar_manejo_sanitario", {
    p_animal_ids: animalIds,
    p_area_id: areaId,
    p_medicamento_ids: medicamentoIds,
    p_responsavel: responsavel,
    p_observacoes: observacoes,
    p_data: data,
    p_especie: especie,
    p_descricao: descricao,
  });

  if (error) return { erro: "Não foi possível registrar: " + error.message };

  revalidatePath(caminho(localId));
  return {};
}

export async function atualizarManejoSanitario(
  _estadoAnterior: EstadoManejo,
  formData: FormData,
): Promise<EstadoManejo> {
  const localId = formData.get("localId") as string;
  const manejoId = formData.get("manejoId") as string;
  const animalIds = JSON.parse((formData.get("animalIds") as string) || "[]") as string[];
  const medicamentoIds = JSON.parse((formData.get("medicamentoIds") as string) || "[]") as string[];
  const areaId = formData.get("areaId") as string;

  if (animalIds.length === 0) return { erro: "Selecione ao menos um animal." };
  if (!areaId) return { erro: "Selecione a área." };

  const data = formData.get("data") as string;
  const responsavel = (formData.get("responsavel") as string)?.trim() || null;
  const observacoes = (formData.get("observacoes") as string)?.trim() || null;
  const descricao = (formData.get("descricao") as string)?.trim() || null;

  const supabase = await criarClienteServidor();
  const { error } = await supabase.rpc("atualizar_manejo_sanitario", {
    p_manejo_id: manejoId,
    p_area_id: areaId,
    p_data: data,
    p_responsavel: responsavel,
    p_observacoes: observacoes,
    p_animal_ids: animalIds,
    p_medicamento_ids: medicamentoIds,
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

export async function apagarManejoSanitario(localId: string, manejoId: string): Promise<ResultadoAcao> {
  const supabase = await criarClienteServidor();
  const { error } = await supabase.rpc("apagar_manejo_sanitario", { p_manejo_id: manejoId });
  if (error) return { error: error.message };
  revalidatePath(caminho(localId));
  return {};
}
