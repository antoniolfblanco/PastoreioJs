"use server";

import { revalidatePath } from "next/cache";
import { criarClienteServidor } from "@/lib/supabase/server";

export type EstadoMovimentacao = { erro?: string } | undefined;

function caminho(localId: string) {
  return `/${localId}/areas/movimentacao`;
}

export async function moverAnimais(
  _estadoAnterior: EstadoMovimentacao,
  formData: FormData,
): Promise<EstadoMovimentacao> {
  const localId = formData.get("localId") as string;
  const animalIds = JSON.parse((formData.get("animalIds") as string) || "[]") as string[];
  const areaDestinoId = formData.get("areaDestinoId") as string;

  if (animalIds.length === 0) return { erro: "Selecione ao menos um animal." };
  if (!areaDestinoId) return { erro: "Selecione a área de destino." };

  const data = formData.get("data") as string;
  const responsavel = (formData.get("responsavel") as string)?.trim() || null;
  const descricao = (formData.get("descricao") as string)?.trim() || null;

  const supabase = await criarClienteServidor();
  const { error } = await supabase.rpc("mover_animais", {
    p_animal_ids: animalIds,
    p_area_destino_id: areaDestinoId,
    p_responsavel: responsavel,
    p_data: data,
    p_descricao: descricao,
  });

  if (error) return { erro: "Não foi possível registrar: " + error.message };

  revalidatePath(caminho(localId));
  return {};
}

// Só edita se nenhum animal do grupo já tiver sido movido de novo depois
// (a RPC recusa nesse caso) — não precisa checar isso aqui, o banco garante.
export async function atualizarMovimentacao(
  _estadoAnterior: EstadoMovimentacao,
  formData: FormData,
): Promise<EstadoMovimentacao> {
  const localId = formData.get("localId") as string;
  const grupoId = formData.get("grupoId") as string;
  const areaDestinoId = formData.get("areaDestinoId") as string;
  if (!areaDestinoId) return { erro: "Selecione a área de destino." };

  const data = formData.get("data") as string;
  const responsavel = (formData.get("responsavel") as string)?.trim() || null;
  const descricao = (formData.get("descricao") as string)?.trim() || null;

  const supabase = await criarClienteServidor();
  const { error } = await supabase.rpc("atualizar_movimentacao", {
    p_grupo_id: grupoId,
    p_area_destino_id: areaDestinoId,
    p_data: data,
    p_responsavel: responsavel,
    p_descricao: descricao,
  });

  if (error) return { erro: "Não foi possível salvar: " + error.message };

  revalidatePath(caminho(localId));
  return {};
}

// Desfazer não apaga nada — registra uma NOVA movimentação invertendo
// origem e destino da última, igual à troca de categoria.
export async function desfazerUltimaMovimentacao(localId: string) {
  const supabase = await criarClienteServidor();
  const { error } = await supabase.rpc("desfazer_ultima_movimentacao", { p_local_id: localId });
  if (error) throw new Error(error.message);
  revalidatePath(caminho(localId));
}
