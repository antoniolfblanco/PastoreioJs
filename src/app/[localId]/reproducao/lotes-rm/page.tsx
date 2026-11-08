import { buscarLocalAtual, podeGerenciarConteudo } from "@/lib/local";
import { criarClienteServidor } from "@/lib/supabase/server";
import type { AnimalSelecionavel } from "@/components/card-selecao-animais";
import { ListaLotesRm } from "./lista-lotes-rm";

export type Especie = "bovino" | "ovino" | "equino";

export type TouroDoLote = {
  id: string;
  identificacao: string;
};

export type LoteRm = {
  id: string;
  nome: string;
  data_inicio: string | null;
  data_fim: string | null;
  touros: TouroDoLote[];
};

// Candidato a touro do lote: só animais próprios ativos, machos e não
// castrados (monta natural exige o touro fisicamente no rebanho e capaz de
// cobrir — o banco também recusa touro externo com um trigger).
// Mesmo formato do card de seleção compartilhado (filtros por área, categoria...).
export type CandidatoTouro = AnimalSelecionavel;

function primeiro<T>(valor: T | T[] | null): T | null {
  return Array.isArray(valor) ? (valor[0] ?? null) : valor;
}

function identificacao(a: { nome: string | null; brinco: string | null; tatuagem: string | null } | null) {
  if (!a) return "—";
  return [a.brinco, a.tatuagem, a.nome].filter(Boolean).join(" • ") || "Sem identificação";
}

export default async function LotesRmPage({
  params,
}: {
  params: Promise<{ localId: string }>;
}) {
  const { localId } = await params;
  const local = await buscarLocalAtual(localId);

  const supabase = await criarClienteServidor();
  const [
    { data: lotesRaw, error: erroLotes },
    { data: candidatosRaw, error: erroCandidatos },
  ] = await Promise.all([
    supabase.from("lotes_rm").select("id, nome, data_inicio, data_fim").eq("local_id", localId).eq("ativo", true).order("nome"),
    supabase
      .from("animais")
      .select(
        "id, nome, brinco, tatuagem, especie, sexo, grau_sangue, areas(nome), categorias!categoria_id(descricao), racas(descricao)",
      )
      .eq("local_id", localId)
      .eq("origem_registro", "proprio")
      .eq("situacao", "ativo")
      .eq("sexo", "macho")
      .eq("castrado", false),
  ]);

  if (erroLotes || erroCandidatos) {
    throw new Error("Não foi possível carregar os lotes RM: " + (erroLotes?.message || erroCandidatos?.message));
  }

  const idsLotes = (lotesRaw ?? []).map((l) => l.id);
  const { data: vinculosRaw, error: erroVinculos } = idsLotes.length
    ? await supabase
        .from("lotes_rm_touros")
        .select("lote_rm_id, touro_id, animais(nome, brinco, tatuagem)")
        .in("lote_rm_id", idsLotes)
    : { data: [] as { lote_rm_id: string; touro_id: string; animais: unknown }[], error: null };

  if (erroVinculos) {
    throw new Error("Não foi possível carregar os lotes RM: " + erroVinculos.message);
  }

  const tourosPorLote = new Map<string, TouroDoLote[]>();
  for (const v of vinculosRaw ?? []) {
    const animal = primeiro(
      v.animais as
        | { nome: string | null; brinco: string | null; tatuagem: string | null }
        | { nome: string | null; brinco: string | null; tatuagem: string | null }[]
        | null,
    );
    const lista = tourosPorLote.get(v.lote_rm_id) ?? [];
    lista.push({ id: v.touro_id, identificacao: identificacao(animal) });
    tourosPorLote.set(v.lote_rm_id, lista);
  }

  const candidatos: CandidatoTouro[] = (candidatosRaw ?? []).map((a) => ({
    id: a.id,
    nome: a.nome,
    brinco: a.brinco,
    tatuagem: a.tatuagem,
    especie: a.especie as Especie,
    sexo: a.sexo,
    grau_sangue: a.grau_sangue,
    area_nome: primeiro(a.areas as { nome: string } | { nome: string }[] | null)?.nome ?? "—",
    categoria_descricao:
      primeiro(a.categorias as { descricao: string } | { descricao: string }[] | null)?.descricao ?? "—",
    raca_descricao: primeiro(a.racas as { descricao: string } | { descricao: string }[] | null)?.descricao ?? "—",
  }));

  const lotes: LoteRm[] = (lotesRaw ?? []).map((l) => ({
    id: l.id,
    nome: l.nome,
    data_inicio: l.data_inicio,
    data_fim: l.data_fim,
    touros: tourosPorLote.get(l.id) ?? [],
  }));

  return (
    <div className="flex flex-1 flex-col gap-4">
      <ListaLotesRm
        localId={localId}
        lotes={lotes}
        candidatos={candidatos}
        podeEditar={podeGerenciarConteudo(local.perfil)}
      />
    </div>
  );
}
