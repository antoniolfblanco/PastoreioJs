"use server";

import { criarClienteServidor } from "@/lib/supabase/server";

// Genealogia de 5 gerações (o animal + 4 de ancestrais), como no
// certificado da raça. Vem num vetor em "árvore de heap": posição 0 é o
// animal; os pais da posição i estão em 2i+1 (pai) e 2i+2 (mãe). São 31
// posições; null onde o ancestral não está cadastrado.

export type NoGenealogia = {
  id: string;
  nome: string | null;
  brinco: string | null;
  tatuagem: string | null;
  sexo: "macho" | "femea" | "desconhecido";
  registro_definitivo: string | null;
  registro_provisorio: string | null;
  data_nascimento: string | null;
  pelagem: string | null;
  raca: string | null;
  grau_sangue: string | null;
};

const GERACOES = 5;
const POSICOES = 2 ** GERACOES - 1; // 31

type Linha = {
  id: string;
  nome: string | null;
  brinco: string | null;
  tatuagem: string | null;
  sexo: NoGenealogia["sexo"];
  registro_definitivo: string | null;
  registro_provisorio: string | null;
  data_nascimento: string | null;
  grau_sangue: string | null;
  pai_id: string | null;
  mae_id: string | null;
  pelagens: { descricao: string } | { descricao: string }[] | null;
  racas: { descricao: string } | { descricao: string }[] | null;
};

function primeiro<T>(v: T | T[] | null): T | null {
  return Array.isArray(v) ? (v[0] ?? null) : v;
}

export async function buscarGenealogia(animalId: string): Promise<{ nos: (NoGenealogia | null)[] } | { error: string }> {
  const supabase = await criarClienteServidor();
  const nos: (NoGenealogia | null)[] = Array(POSICOES).fill(null);

  // Uma consulta por geração, com os ids da geração anterior.
  let geracao: { posicao: number; id: string }[] = [{ posicao: 0, id: animalId }];
  while (geracao.length > 0) {
    const ids = Array.from(new Set(geracao.map((g) => g.id)));
    const { data, error } = await supabase
      .from("animais")
      .select(
        `id, nome, brinco, tatuagem, sexo, registro_definitivo, registro_provisorio, data_nascimento, grau_sangue,
         pai_id, mae_id, pelagens(descricao), racas(descricao)`,
      )
      .in("id", ids);
    if (error) return { error: "Não foi possível carregar a genealogia: " + error.message };
    const porId = new Map(((data ?? []) as Linha[]).map((l) => [l.id, l]));

    const proxima: { posicao: number; id: string }[] = [];
    for (const { posicao, id } of geracao) {
      const l = porId.get(id);
      if (!l) continue; // ancestral fora do alcance (outro local sem acesso)
      nos[posicao] = {
        id: l.id,
        nome: l.nome,
        brinco: l.brinco,
        tatuagem: l.tatuagem,
        sexo: l.sexo,
        registro_definitivo: l.registro_definitivo,
        registro_provisorio: l.registro_provisorio,
        data_nascimento: l.data_nascimento,
        pelagem: primeiro(l.pelagens)?.descricao ?? null,
        raca: primeiro(l.racas)?.descricao ?? null,
        grau_sangue: l.grau_sangue,
      };
      const posPai = 2 * posicao + 1;
      if (posPai < POSICOES) {
        if (l.pai_id) proxima.push({ posicao: posPai, id: l.pai_id });
        if (l.mae_id) proxima.push({ posicao: posPai + 1, id: l.mae_id });
      }
    }
    geracao = proxima;
  }

  if (!nos[0]) return { error: "Animal não encontrado." };
  return { nos };
}
