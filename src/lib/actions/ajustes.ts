"use server";

import { revalidatePath } from "next/cache";
import { criarClienteServidor } from "@/lib/supabase/server";

export type EstadoAjuste = { erro?: string } | undefined;

function caminho(localId: string) {
  return `/${localId}/ocorrencias/ajustes`;
}

// "Entrada" é achar animal a mais na contagem física (nunca contado antes) —
// cria animais novos com origem_entrada='ajuste' (por isso NÃO soma no saldo
// inicial do ciclo, diferente de cadastro direto). Sexo é sempre derivado da
// categoria escolhida, igual ao resto do sistema, mesmo a RPC aceitando um
// p_sexo à parte — busca aqui pra manter essa regra.
export async function registrarEntradaAjuste(
  _estadoAnterior: EstadoAjuste,
  formData: FormData,
): Promise<EstadoAjuste> {
  const localId = formData.get("localId") as string;
  const areaId = formData.get("areaId") as string;
  const categoriaId = formData.get("categoriaId") as string;
  const racaId = formData.get("racaId") as string;
  const quantidade = Number(formData.get("quantidade"));

  if (!areaId) return { erro: "Selecione a área." };
  if (!categoriaId) return { erro: "Selecione a categoria." };
  if (!racaId) return { erro: "Selecione a raça." };
  if (!Number.isInteger(quantidade) || quantidade < 1) return { erro: "Informe uma quantidade válida." };

  const data = formData.get("data") as string;
  const grauSangue = (formData.get("grauSangue") as string) || "Desconhecido";
  const responsavel = (formData.get("responsavel") as string)?.trim() || null;
  const observacoes = (formData.get("observacoes") as string)?.trim() || null;
  const descricao = (formData.get("descricao") as string)?.trim() || null;

  const supabase = await criarClienteServidor();

  const { data: categoria, error: erroCategoria } = await supabase
    .from("categorias")
    .select("especie, sexo")
    .eq("id", categoriaId)
    .eq("local_id", localId)
    .single();
  if (erroCategoria || !categoria) return { erro: "Categoria inválida." };

  const { error } = await supabase.rpc("registrar_entrada_ajuste", {
    p_local_id: localId,
    p_area_id: areaId,
    p_categoria_id: categoriaId,
    p_especie: categoria.especie,
    p_quantidade: quantidade,
    p_raca_id: racaId,
    p_sexo: categoria.sexo,
    p_grau_sangue: grauSangue,
    p_data: data,
    p_responsavel: responsavel,
    p_observacoes: observacoes,
    p_descricao: descricao,
  });

  if (error) return { erro: "Não foi possível registrar: " + error.message };

  revalidatePath(caminho(localId));
  return {};
}

export async function registrarSaidaAjuste(
  _estadoAnterior: EstadoAjuste,
  formData: FormData,
): Promise<EstadoAjuste> {
  const localId = formData.get("localId") as string;
  const animalIds = JSON.parse((formData.get("animalIds") as string) || "[]") as string[];
  if (animalIds.length === 0) return { erro: "Selecione ao menos um animal." };

  const data = formData.get("data") as string;
  const responsavel = (formData.get("responsavel") as string)?.trim() || null;
  const observacoes = (formData.get("observacoes") as string)?.trim() || null;
  const descricao = (formData.get("descricao") as string)?.trim() || null;
  const valorAtualTexto = formData.get("valorAtual") as string;

  const supabase = await criarClienteServidor();
  const { error } = await supabase.rpc("registrar_saida_ajuste", {
    p_animal_ids: animalIds,
    p_data: data,
    p_responsavel: responsavel,
    p_observacoes: observacoes,
    p_descricao: descricao,
    p_valor_atual: valorAtualTexto ? Number(valorAtualTexto) : null,
  });

  if (error) return { erro: "Não foi possível registrar: " + error.message };

  revalidatePath(caminho(localId));
  return {};
}

// Erros esperados (regra de negócio da RPC) viram valor de retorno, nunca
// throw — o Next.js redige qualquer erro lançado (throw) de uma Server
// Function em produção, só mostra o texto real em dev.
export type ResultadoAcao = { error?: string };

// Entrada e saída têm "mais recente" próprios (são contados separadamente
// pela RPC) — desfazer uma não mexe na outra. Desfazer entrada apaga os
// animais criados (recusa se algum já saiu do rebanho de outro jeito);
// desfazer saída só devolve a situação pra ativo.
export async function desfazerUltimaEntradaAjuste(localId: string): Promise<ResultadoAcao> {
  const supabase = await criarClienteServidor();
  const { error } = await supabase.rpc("desfazer_ultima_entrada_ajuste", { p_local_id: localId });
  if (error) return { error: error.message };
  revalidatePath(caminho(localId));
  return {};
}

export async function desfazerUltimaSaidaAjuste(localId: string): Promise<ResultadoAcao> {
  const supabase = await criarClienteServidor();
  const { error } = await supabase.rpc("desfazer_ultima_saida_ajuste", { p_local_id: localId });
  if (error) return { error: error.message };
  revalidatePath(caminho(localId));
  return {};
}
