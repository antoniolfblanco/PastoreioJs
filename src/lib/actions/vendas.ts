"use server";

import { revalidatePath } from "next/cache";
import { criarClienteServidor } from "@/lib/supabase/server";

export type EstadoVenda = { erro?: string } | undefined;

function caminho(localId: string) {
  return `/${localId}/vendas`;
}

type AnimalVenda = {
  animal_id: string;
  peso_venda: number | null;
  a_rendimento: boolean;
  valor_venda_previsto: number | null;
  valor_venda_definitivo: number | null;
};

export async function registrarVenda(
  _estadoAnterior: EstadoVenda,
  formData: FormData,
): Promise<EstadoVenda> {
  const localId = formData.get("localId") as string;
  const animais = JSON.parse((formData.get("animais") as string) || "[]") as AnimalVenda[];
  if (animais.length === 0) return { erro: "Selecione ao menos um animal." };

  const data = formData.get("data") as string;
  if (!data) return { erro: "Informe a data da venda." };

  const descricao = (formData.get("descricao") as string)?.trim() || null;
  const comprador = (formData.get("comprador") as string)?.trim() || null;
  const prazoRecebimento = (formData.get("prazoRecebimento") as string) || null;
  const recebido = formData.get("recebido") === "on";
  const responsavel = (formData.get("responsavel") as string)?.trim() || null;
  const observacoes = (formData.get("observacoes") as string)?.trim() || null;

  const supabase = await criarClienteServidor();
  const { error } = await supabase.rpc("registrar_venda", {
    p_local_id: localId,
    p_data: data,
    p_comprador: comprador,
    p_prazo_recebimento: prazoRecebimento,
    p_recebido: recebido,
    p_responsavel: responsavel,
    p_observacoes: observacoes,
    p_animais: animais,
    p_descricao: descricao,
  });

  if (error) return { erro: "Não foi possível registrar a venda: " + error.message };

  revalidatePath(caminho(localId));
  return {};
}

export async function atualizarVenda(
  _estadoAnterior: EstadoVenda,
  formData: FormData,
): Promise<EstadoVenda> {
  const localId = formData.get("localId") as string;
  const vendaId = formData.get("vendaId") as string;
  const data = formData.get("data") as string;
  if (!data) return { erro: "Informe a data da venda." };

  const descricao = (formData.get("descricao") as string)?.trim() || null;
  const comprador = (formData.get("comprador") as string)?.trim() || null;
  const prazoRecebimento = (formData.get("prazoRecebimento") as string) || null;
  const recebido = formData.get("recebido") === "on";
  const responsavel = (formData.get("responsavel") as string)?.trim() || null;
  const observacoes = (formData.get("observacoes") as string)?.trim() || null;

  const supabase = await criarClienteServidor();
  const { error } = await supabase.rpc("atualizar_venda", {
    p_venda_id: vendaId,
    p_comprador: comprador,
    p_prazo_recebimento: prazoRecebimento,
    p_recebido: recebido,
    p_data: data,
    p_responsavel: responsavel,
    p_observacoes: observacoes,
    p_descricao: descricao,
  });

  if (error) return { erro: "Não foi possível salvar: " + error.message };
  revalidatePath(caminho(localId));
  return {};
}

// Apaga a venda e devolve os animais pro rebanho ativo (não apaga o
// animal — ele já existia antes da venda).
export async function apagarVenda(localId: string, vendaId: string) {
  const supabase = await criarClienteServidor();
  const { error } = await supabase.rpc("apagar_venda", { p_venda_id: vendaId });
  if (error) throw new Error(error.message);
  revalidatePath(caminho(localId));
}

// Fecha a venda por um total, rateado entre TODOS os animais dela — por
// peso quando todos têm peso de venda, senão igual por cabeça.
export async function definirValorTotalVenda(localId: string, vendaId: string, valorTotal: number) {
  const supabase = await criarClienteServidor();
  const { error } = await supabase.rpc("definir_valor_total_venda", {
    p_venda_id: vendaId,
    p_valor_total: valorTotal,
  });
  if (error) throw new Error(error.message);
  revalidatePath(caminho(localId));
}

// Confirma o valor definitivo só dos animais "a rendimento" ainda
// pendentes, rateado por peso (exige peso de venda em todos os pendentes).
export async function confirmarValorTotalVenda(localId: string, vendaId: string, valorTotal: number) {
  const supabase = await criarClienteServidor();
  const { error } = await supabase.rpc("confirmar_valor_total_venda", {
    p_venda_id: vendaId,
    p_valor_total: valorTotal,
  });
  if (error) throw new Error(error.message);
  revalidatePath(caminho(localId));
}
