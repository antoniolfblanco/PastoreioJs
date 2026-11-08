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
  // Acasalamento de onde veio (cobertura confirmada). Preenchido, mãe e
  // receptora saem dele e maeId/receptoraId abaixo são ignorados. O pai
  // também sai dele, a não ser que paiDoAcasalamento seja false (o usuário
  // trocou o pai — outro touro ou um lote RM — mantendo o vínculo).
  coberturaId?: string | null;
  paiDoAcasalamento?: boolean;
  // Pai como lote RM (monta natural em grupo, touro exato desconhecido).
  paiRmLoteId?: string | null;
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

  // Acasalamentos citados: confere que são do local e confirmados, e pega a
  // genealogia de cada um (mesmos campos que a RPC registrar_nascimento usa).
  const idsCoberturas = Array.from(
    new Set(itens.map((i) => (i.tipo === "individual" ? i.coberturaId : null)).filter((id): id is string => !!id)),
  );
  const coberturaPorId = new Map<
    string,
    { femea_id: string; touro_id: string | null; rm_lote_id: string | null; receptora_id: string | null }
  >();
  if (idsCoberturas.length > 0) {
    const { data: coberturas, error: erroCoberturas } = await supabase
      .from("coberturas_detalhe")
      .select("id, femea_id, touro_id, rm_lote_id, receptora_id, confirmada")
      .eq("local_id", localId)
      .in("id", idsCoberturas);
    if (erroCoberturas) return { error: "Não foi possível conferir os acasalamentos: " + erroCoberturas.message };
    for (const c of coberturas ?? []) if (c.confirmada) coberturaPorId.set(c.id, c);
  }

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
    const cobertura = individual && item.coberturaId ? coberturaPorId.get(item.coberturaId) : undefined;
    if (individual && item.coberturaId && !cobertura) {
      return { error: "Um dos acasalamentos escolhidos não existe mais ou não está confirmado." };
    }
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
      mae_id: cobertura ? cobertura.femea_id : individual ? item.maeId || null : null,
      pai_id:
        cobertura && item.paiDoAcasalamento !== false ? cobertura.touro_id : individual ? item.paiId || null : null,
      pai_rm_lote_id:
        cobertura && item.paiDoAcasalamento !== false
          ? cobertura.rm_lote_id
          : individual
            ? item.paiRmLoteId || null
            : null,
      receptora_id: cobertura ? cobertura.receptora_id : individual ? item.receptoraId || null : null,
      cobertura_id: cobertura ? item.coberturaId : null,
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
