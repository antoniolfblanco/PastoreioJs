"use server";

import { revalidatePath } from "next/cache";
import { criarClienteServidor } from "@/lib/supabase/server";

export type EstadoCompra = { erro?: string } | undefined;

function caminho(localId: string) {
  return `/${localId}/compras`;
}

type AnimalCompra = {
  area_id: string;
  categoria_id: string;
  especie: string;
  nome: string | null;
  brinco: string | null;
  tatuagem: string | null;
  data_nascimento: string | null;
  raca_id: string;
  grau_sangue: string;
  registro_provisorio: string | null;
  registro_definitivo: string | null;
  observacoes: string | null;
  castrado: boolean;
  peso_compra: number | null;
  valor_compra: number | null;
};

export async function registrarCompra(
  _estadoAnterior: EstadoCompra,
  formData: FormData,
): Promise<EstadoCompra> {
  const localId = formData.get("localId") as string;
  const animais = JSON.parse((formData.get("animais") as string) || "[]") as AnimalCompra[];
  if (animais.length === 0) return { erro: "Adicione ao menos um animal." };

  const data = formData.get("data") as string;
  if (!data) return { erro: "Informe a data da compra." };

  const descricao = (formData.get("descricao") as string)?.trim() || null;
  const fornecedor = (formData.get("fornecedor") as string)?.trim() || null;
  const prazoPagamento = (formData.get("prazoPagamento") as string) || null;
  const pago = formData.get("pago") === "on";
  const responsavel = (formData.get("responsavel") as string)?.trim() || null;
  const observacoes = (formData.get("observacoes") as string)?.trim() || null;

  const supabase = await criarClienteServidor();
  const { error } = await supabase.rpc("registrar_compra", {
    p_local_id: localId,
    p_data: data,
    p_fornecedor: fornecedor,
    p_prazo_pagamento: prazoPagamento,
    p_pago: pago,
    p_responsavel: responsavel,
    p_observacoes: observacoes,
    p_animais: animais,
    p_descricao: descricao,
  });

  if (error) return { erro: "Não foi possível registrar a compra: " + error.message };

  revalidatePath(caminho(localId));
  return {};
}

export async function atualizarCompra(
  _estadoAnterior: EstadoCompra,
  formData: FormData,
): Promise<EstadoCompra> {
  const localId = formData.get("localId") as string;
  const compraId = formData.get("compraId") as string;
  const data = formData.get("data") as string;
  if (!data) return { erro: "Informe a data da compra." };

  const descricao = (formData.get("descricao") as string)?.trim() || null;
  const fornecedor = (formData.get("fornecedor") as string)?.trim() || null;
  const prazoPagamento = (formData.get("prazoPagamento") as string) || null;
  const pago = formData.get("pago") === "on";
  const responsavel = (formData.get("responsavel") as string)?.trim() || null;
  const observacoes = (formData.get("observacoes") as string)?.trim() || null;

  const supabase = await criarClienteServidor();
  const { error } = await supabase.rpc("atualizar_compra", {
    p_compra_id: compraId,
    p_fornecedor: fornecedor,
    p_prazo_pagamento: prazoPagamento,
    p_pago: pago,
    p_data: data,
    p_responsavel: responsavel,
    p_observacoes: observacoes,
    p_descricao: descricao,
  });

  if (error) return { erro: "Não foi possível salvar: " + error.message };
  revalidatePath(caminho(localId));
  return {};
}

// Apaga a compra e os animais que ela criou (reutiliza apagar_animal, que
// recusa se algum já tiver histórico que não pode se perder).
export async function apagarCompra(localId: string, compraId: string) {
  const supabase = await criarClienteServidor();
  const { error } = await supabase.rpc("apagar_compra", { p_compra_id: compraId });
  if (error) throw new Error(error.message);
  revalidatePath(caminho(localId));
}

export async function definirValorCompraAnimal(localId: string, animalId: string, valor: number) {
  const supabase = await criarClienteServidor();
  const { error } = await supabase.rpc("definir_valor_compra_animal", {
    p_animal_id: animalId,
    p_valor: valor,
  });
  if (error) throw new Error(error.message);
  revalidatePath(caminho(localId));
}

// Fecha a compra por um total, rateado entre todos os animais dela — por
// peso quando todos têm peso de compra, senão igual por cabeça.
export async function definirValorTotalCompra(localId: string, compraId: string, valorTotal: number) {
  const supabase = await criarClienteServidor();
  const { error } = await supabase.rpc("definir_valor_total_compra", {
    p_compra_id: compraId,
    p_valor_total: valorTotal,
  });
  if (error) throw new Error(error.message);
  revalidatePath(caminho(localId));
}
