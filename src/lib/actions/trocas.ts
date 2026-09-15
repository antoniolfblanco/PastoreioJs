"use server";

import { revalidatePath } from "next/cache";
import { criarClienteServidor } from "@/lib/supabase/server";

export type EstadoTroca = { erro?: string } | undefined;

function caminho(localId: string) {
  return `/${localId}/categorias/trocar`;
}

export async function trocarCategoria(
  _estadoAnterior: EstadoTroca,
  formData: FormData,
): Promise<EstadoTroca> {
  const localId = formData.get("localId") as string;
  const animalIds = JSON.parse((formData.get("animalIds") as string) || "[]") as string[];
  const categoriaDestinoId = formData.get("categoriaDestinoId") as string;

  if (animalIds.length === 0) return { erro: "Selecione ao menos um animal." };
  if (!categoriaDestinoId) return { erro: "Selecione a categoria de destino." };

  const data = formData.get("data") as string;
  const responsavel = (formData.get("responsavel") as string)?.trim() || null;
  const descricao = (formData.get("descricao") as string)?.trim() || null;
  const valorAtualTexto = formData.get("valorAtual") as string;

  // Todos os animais selecionados vão pra mesma categoria de destino nesta
  // tela — a RPC do banco na verdade aceita um destino diferente por
  // animal (arrays paralelos), mas isso exigiria uma tela bem mais
  // complexa (tipo planilha) pra um caso de uso bem mais raro.
  const categoriasDestino = animalIds.map(() => categoriaDestinoId);

  const supabase = await criarClienteServidor();
  const { error } = await supabase.rpc("trocar_categoria", {
    p_animal_ids: animalIds,
    p_categorias_destino: categoriasDestino,
    p_responsavel: responsavel,
    p_data: data,
    p_descricao: descricao,
    p_valor_atual: valorAtualTexto ? Number(valorAtualTexto) : null,
  });

  if (error) return { erro: "Não foi possível registrar: " + error.message };

  revalidatePath(caminho(localId));
  return {};
}

// Desfazer não apaga nada — registra uma NOVA troca invertendo origem e
// destino da última (é assim que a RPC do banco funciona, pra manter
// histórico completo de toda mudança de categoria).
export async function desfazerUltimaTrocaCategoria(localId: string) {
  const supabase = await criarClienteServidor();
  const { error } = await supabase.rpc("desfazer_ultima_troca_categoria", { p_local_id: localId });
  if (error) throw new Error(error.message);
  revalidatePath(caminho(localId));
}
