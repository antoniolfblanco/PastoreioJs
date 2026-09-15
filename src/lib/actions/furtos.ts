"use server";

import { revalidatePath } from "next/cache";
import { criarClienteServidor } from "@/lib/supabase/server";

export type EstadoFurto = { erro?: string } | undefined;

function caminho(localId: string) {
  return `/${localId}/ocorrencias/furtos`;
}

export async function registrarFurto(
  _estadoAnterior: EstadoFurto,
  formData: FormData,
): Promise<EstadoFurto> {
  const localId = formData.get("localId") as string;
  const animalIds = JSON.parse((formData.get("animalIds") as string) || "[]") as string[];
  if (animalIds.length === 0) return { erro: "Selecione ao menos um animal." };

  const data = formData.get("data") as string;
  const ocorrencia = (formData.get("ocorrencia") as string)?.trim() || null;
  const observacoes = (formData.get("observacoes") as string)?.trim() || null;
  const responsavel = (formData.get("responsavel") as string)?.trim() || null;
  const descricao = (formData.get("descricao") as string)?.trim() || null;
  const valorAtualTexto = formData.get("valorAtual") as string;

  const supabase = await criarClienteServidor();
  const { error } = await supabase.rpc("registrar_furto", {
    p_local_id: localId,
    p_data: data,
    p_ocorrencia: ocorrencia,
    p_responsavel: responsavel,
    p_observacoes: observacoes,
    p_animal_ids: animalIds,
    p_descricao: descricao,
    p_valor_atual: valorAtualTexto ? Number(valorAtualTexto) : null,
  });

  if (error) return { erro: "Não foi possível registrar: " + error.message };

  revalidatePath(caminho(localId));
  return {};
}

export async function atualizarFurto(
  _estadoAnterior: EstadoFurto,
  formData: FormData,
): Promise<EstadoFurto> {
  const localId = formData.get("localId") as string;
  const furtoId = formData.get("furtoId") as string;
  const data = formData.get("data") as string;
  const ocorrencia = (formData.get("ocorrencia") as string)?.trim() || null;
  const observacoes = (formData.get("observacoes") as string)?.trim() || null;
  const responsavel = (formData.get("responsavel") as string)?.trim() || null;
  const descricao = (formData.get("descricao") as string)?.trim() || null;

  const supabase = await criarClienteServidor();
  const { error } = await supabase.rpc("atualizar_furto", {
    p_furto_id: furtoId,
    p_data: data,
    p_ocorrencia: ocorrencia,
    p_responsavel: responsavel,
    p_observacoes: observacoes,
    p_descricao: descricao,
  });

  if (error) return { erro: "Não foi possível salvar: " + error.message };

  revalidatePath(caminho(localId));
  return {};
}
