"use server";

import { revalidatePath } from "next/cache";
import { criarClienteServidor } from "@/lib/supabase/server";

// Grupos cadastrados que dividem os relatórios: grupos de categoria (por
// espécie) no Resumo de Movimentações e grupos de área na Lotação por Área.
// O banco mantém categorias.grupo (texto, lido pelo app) em sincronia com
// categorias.grupo_id por trigger.

export type TipoGrupo = "categoria" | "area";
export type EspecieGrupo = "bovino" | "ovino" | "equino";

export type GrupoCadastrado = { id: string; nome: string; ordem: number; especie: EspecieGrupo | null };
export type ItemAgrupavel = { id: string; nome: string; grupo_id: string | null; especie: EspecieGrupo | null; ativo: boolean };

export async function buscarGrupos(
  localId: string,
  tipo: TipoGrupo,
): Promise<{ grupos: GrupoCadastrado[]; itens: ItemAgrupavel[] } | { error: string }> {
  const supabase = await criarClienteServidor();
  if (tipo === "categoria") {
    const [grupos, itens] = await Promise.all([
      supabase.from("grupos_categoria").select("id, nome, ordem, especie").eq("local_id", localId).order("ordem").order("nome"),
      supabase
        .from("categorias")
        .select("id, descricao, grupo_id, especie, ativo")
        .eq("local_id", localId)
        .order("ordem")
        .order("descricao"),
    ]);
    const erro = grupos.error ?? itens.error;
    if (erro) return { error: "Não foi possível carregar os grupos: " + erro.message };
    return {
      grupos: (grupos.data ?? []) as GrupoCadastrado[],
      itens: (itens.data ?? []).map((c) => ({
        id: c.id,
        nome: c.descricao,
        grupo_id: c.grupo_id,
        especie: c.especie,
        ativo: c.ativo,
      })),
    };
  }
  const [grupos, itens] = await Promise.all([
    supabase.from("grupos_area").select("id, nome, ordem").eq("local_id", localId).order("ordem").order("nome"),
    supabase.from("areas").select("id, nome, grupo_id, ativo").eq("local_id", localId).order("ordem").order("nome"),
  ]);
  const erro = grupos.error ?? itens.error;
  if (erro) return { error: "Não foi possível carregar os grupos: " + erro.message };
  return {
    grupos: (grupos.data ?? []).map((g) => ({ ...g, especie: null })),
    itens: (itens.data ?? []).map((a) => ({ ...a, especie: null })),
  };
}

// Um grupo vindo da tela: `id` nulo é grupo novo; `chave` identifica o grupo
// nos vínculos (o id, ou uma chave temporária para os novos).
export type GrupoEditado = { chave: string; id: string | null; nome: string };

// Grava a lista inteira de uma vez (para categoria, a de uma espécie): os
// grupos na ordem recebida, apaga os que saíram e refaz os vínculos.
export async function salvarGrupos(
  localId: string,
  tipo: TipoGrupo,
  especie: EspecieGrupo | null,
  grupos: GrupoEditado[],
  vinculos: { itemId: string; chave: string | null }[],
): Promise<{ error?: string }> {
  const nomes = grupos.map((g) => g.nome.trim());
  if (nomes.some((n) => !n)) return { error: "Todo grupo precisa de um nome." };
  const repetido = nomes.find((n, i) => nomes.findIndex((m) => m.toLowerCase() === n.toLowerCase()) !== i);
  if (repetido) return { error: `O grupo "${repetido}" aparece duas vezes.` };
  if (tipo === "categoria" && !especie) return { error: "Espécie não informada." };

  const supabase = await criarClienteServidor();
  const tabela = tipo === "categoria" ? "grupos_categoria" : "grupos_area";
  const tabelaItens = tipo === "categoria" ? "categorias" : "areas";

  let consulta = supabase.from(tabela).select("id, nome").eq("local_id", localId);
  if (tipo === "categoria") consulta = consulta.eq("especie", especie!);
  const { data: existentes, error: erroExistentes } = await consulta;
  if (erroExistentes) return { error: "Não foi possível carregar os grupos: " + erroExistentes.message };

  const mantidos = new Set(grupos.filter((g) => g.id).map((g) => g.id!));
  const removidos = (existentes ?? []).filter((g) => !mantidos.has(g.id)).map((g) => g.id);
  if (removidos.length > 0) {
    const { error } = await supabase.from(tabela).delete().in("id", removidos);
    if (error) return { error: "Não foi possível apagar grupo: " + error.message };
  }

  // Renomeações primeiro com nome provisório, para trocas de nome entre dois
  // grupos não baterem no índice único.
  const nomeAtual = new Map((existentes ?? []).map((g) => [g.id, g.nome as string]));
  const renomeados = grupos.filter((g) => g.id && nomeAtual.get(g.id) !== g.nome.trim());
  for (const g of renomeados) {
    const { error } = await supabase.from(tabela).update({ nome: `~${g.id}` }).eq("id", g.id!);
    if (error) return { error: "Não foi possível renomear o grupo: " + error.message };
  }

  const idPorChave = new Map<string, string>();
  for (const [ordem, g] of grupos.entries()) {
    const nome = g.nome.trim();
    if (g.id) {
      const { error } = await supabase.from(tabela).update({ nome, ordem }).eq("id", g.id);
      if (error) return { error: `Não foi possível salvar o grupo "${nome}": ` + error.message };
      idPorChave.set(g.chave, g.id);
    } else {
      const novo: Record<string, unknown> = { local_id: localId, nome, ordem };
      if (tipo === "categoria") novo.especie = especie;
      const { data, error } = await supabase.from(tabela).insert(novo).select("id").single();
      if (error || !data) return { error: `Não foi possível criar o grupo "${nome}": ` + (error?.message ?? "") };
      idPorChave.set(g.chave, data.id);
    }
  }

  // Um update por grupo de destino.
  const porDestino = new Map<string | null, string[]>();
  for (const v of vinculos) {
    const destino = v.chave ? (idPorChave.get(v.chave) ?? null) : null;
    if (!porDestino.has(destino)) porDestino.set(destino, []);
    porDestino.get(destino)!.push(v.itemId);
  }
  for (const [destino, ids] of porDestino) {
    const { error } = await supabase.from(tabelaItens).update({ grupo_id: destino }).eq("local_id", localId).in("id", ids);
    if (error) return { error: "Não foi possível vincular ao grupo: " + error.message };
  }

  revalidatePath(`/${localId}`, "layout");
  return {};
}
