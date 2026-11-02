"use server";

import { revalidatePath } from "next/cache";
import { criarClienteServidor } from "@/lib/supabase/server";

// Mesmo critério de lib/actions/animais.ts: SR e Desconhecido não têm registro.
function grauSangueExigeRegistro(grauSangue: string) {
  return grauSangue !== "SR" && grauSangue !== "Desconhecido";
}

// Um item da lista de nascimentos da tela: individual (um animal, com
// genealogia e peso ao nascer) ou lote (N animais iguais, sem identificação).
export type ItemNascimento = {
  tipo: "individual" | "lote";
  quantidade: number;
  areaId: string;
  categoriaId: string;
  racaId: string;
  grauSangue: string;
  dataNascimento: string;
  observacoes: string | null;
  valor: number | null;
  // Só individual:
  nome?: string | null;
  brinco?: string | null;
  tatuagem?: string | null;
  pesoNascimento?: number | null;
  maeId?: string | null;
  paiId?: string | null;
  receptoraId?: string | null;
  castrado?: boolean;
  registroProvisorio?: string | null;
  registroDefinitivo?: string | null;
};

export type ResultadoNascimentos = { error?: string; total?: number };

// Grava todos os nascimentos da lista num insert só — ou entra tudo, ou nada
// (sem lista pela metade se um brinco repetido derrubar uma linha).
export async function registrarNascimentos(localId: string, itens: ItemNascimento[]): Promise<ResultadoNascimentos> {
  if (itens.length === 0) return { error: "A lista de nascimentos está vazia." };

  const supabase = await criarClienteServidor();

  // Espécie e sexo sempre vêm da categoria, confirmados aqui no servidor.
  const idsCategorias = Array.from(new Set(itens.map((i) => i.categoriaId)));
  const { data: categorias, error: erroCategorias } = await supabase
    .from("categorias")
    .select("id, especie, sexo")
    .eq("local_id", localId)
    .in("id", idsCategorias);
  if (erroCategorias) return { error: "Não foi possível conferir as categorias: " + erroCategorias.message };
  const categoriaPorId = new Map((categorias ?? []).map((c) => [c.id, c]));

  const linhas: Record<string, unknown>[] = [];
  for (const item of itens) {
    const categoria = categoriaPorId.get(item.categoriaId);
    if (!categoria) return { error: "Uma das categorias da lista não é válida." };
    if (!item.areaId) return { error: "Há um nascimento sem área." };
    if (!item.racaId) return { error: "Há um nascimento sem raça." };
    if (!item.dataNascimento) return { error: "Há um nascimento sem data." };
    if (!Number.isInteger(item.quantidade) || item.quantidade < 1) return { error: "Quantidade inválida num lote." };

    const exigeRegistro = grauSangueExigeRegistro(item.grauSangue);
    const individual = item.tipo === "individual";
    const linha = {
      local_id: localId,
      area_id: item.areaId,
      categoria_id: item.categoriaId,
      especie: categoria.especie,
      sexo: categoria.sexo,
      raca_id: item.racaId,
      grau_sangue: item.grauSangue,
      data_nascimento: item.dataNascimento,
      observacoes: item.observacoes?.trim() || null,
      valor: item.valor,
      origem_registro: "proprio",
      situacao: "ativo",
      // Nascimento nunca soma no estoque inicial do ciclo (igual ao app).
      origem_entrada: "nascimento",
      categoria_estoque_inicial_id: null,
      nome: individual ? item.nome?.trim() || null : null,
      brinco: individual ? item.brinco?.trim().toUpperCase() || null : null,
      tatuagem: individual ? item.tatuagem?.trim() || null : null,
      peso_nascimento: individual ? (item.pesoNascimento ?? null) : null,
      mae_id: individual ? item.maeId || null : null,
      pai_id: individual ? item.paiId || null : null,
      receptora_id: individual ? item.receptoraId || null : null,
      castrado: individual && categoria.sexo === "macho" && !!item.castrado,
      registro_provisorio: individual && exigeRegistro ? item.registroProvisorio?.trim() || null : null,
      registro_definitivo: individual && exigeRegistro ? item.registroDefinitivo?.trim() || null : null,
    };
    for (let n = 0; n < (individual ? 1 : item.quantidade); n++) linhas.push(linha);
  }

  const { error } = await supabase.from("animais").insert(linhas);
  if (error) return { error: "Não foi possível registrar os nascimentos: " + error.message };

  revalidatePath(`/${localId}/nascimentos`);
  revalidatePath(`/${localId}/animais`);
  return { total: linhas.length };
}
