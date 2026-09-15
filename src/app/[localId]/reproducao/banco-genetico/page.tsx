import { buscarLocalAtual, podeGerenciarConteudo } from "@/lib/local";
import { criarClienteServidor } from "@/lib/supabase/server";
import { PainelBancoGenetico } from "./painel-banco-genetico";

export type Especie = "bovino" | "ovino" | "equino";
export type Sexo = "macho" | "femea" | "desconhecido";

export type TouroComEstoque = {
  touro_id: string;
  identificacao: string;
  especie: Especie;
  externo: boolean;
  quantidade_doses: number;
  observacoes: string | null;
};

export type LoteEmbriao = {
  id: string;
  especie: Especie;
  doadora_id: string;
  doadora_identificacao: string;
  doadora_externa: boolean;
  touro_id: string;
  touro_identificacao: string;
  touro_externo: boolean;
  quantidade: number;
  data_producao: string | null;
  observacoes: string | null;
};

// Pool de candidatos a touro/doadora: animais próprios ativos + externos
// (o uso mais comum de Banco Genético é justamente sêmen/embrião de touro
// externo comprado).
export type CandidatoGenetico = {
  id: string;
  nome: string | null;
  brinco: string | null;
  tatuagem: string | null;
  sexo: Sexo;
  especie: Especie;
  externo: boolean;
};

function primeiro<T>(valor: T | T[] | null): T | null {
  return Array.isArray(valor) ? (valor[0] ?? null) : valor;
}

function identificacao(a: { nome: string | null; brinco: string | null; tatuagem: string | null } | null) {
  if (!a) return "—";
  return [a.brinco, a.tatuagem, a.nome].filter(Boolean).join(" • ") || "Sem identificação";
}

type ClienteServidor = Awaited<ReturnType<typeof criarClienteServidor>>;

async function buscarCandidatos(supabase: ClienteServidor, localId: string) {
  const [{ data: proprios, error: erroProprios }, { data: externos, error: erroExternos }] = await Promise.all([
    supabase
      .from("animais")
      .select("id, nome, brinco, tatuagem, sexo, especie")
      .eq("local_id", localId)
      .eq("origem_registro", "proprio")
      .eq("situacao", "ativo"),
    supabase.from("animais").select("id, nome, brinco, tatuagem, sexo, especie").eq("local_id", localId).eq("origem_registro", "externo"),
  ]);

  if (erroProprios || erroExternos) {
    throw new Error("Não foi possível carregar os candidatos: " + (erroProprios?.message || erroExternos?.message));
  }

  const candidatos: CandidatoGenetico[] = [
    ...(proprios ?? []).map((a) => ({ ...a, sexo: a.sexo as Sexo, especie: a.especie as Especie, externo: false })),
    ...(externos ?? []).map((a) => ({ ...a, sexo: a.sexo as Sexo, especie: a.especie as Especie, externo: true })),
  ];

  return candidatos;
}

export default async function BancoGeneticoPage({
  params,
}: {
  params: Promise<{ localId: string }>;
}) {
  const { localId } = await params;
  const local = await buscarLocalAtual(localId);

  const supabase = await criarClienteServidor();
  const [
    { data: semenRaw, error: erroSemen },
    { data: embrioesRaw, error: erroEmbrioes },
    candidatos,
  ] = await Promise.all([
    supabase
      .from("banco_semen")
      .select("id, touro_id, quantidade_doses, observacoes, animais!touro_id(nome, brinco, tatuagem, especie, origem_registro)")
      .eq("local_id", localId),
    supabase
      .from("banco_embrioes")
      .select(
        `id, especie, quantidade, data_producao, observacoes,
         doadora_id, doadora:animais!doadora_id(nome, brinco, tatuagem, origem_registro),
         touro_id, touro:animais!touro_id(nome, brinco, tatuagem, origem_registro)`,
      )
      .eq("local_id", localId)
      .order("criado_em", { ascending: false }),
    buscarCandidatos(supabase, localId),
  ]);

  if (erroSemen || erroEmbrioes) {
    throw new Error("Não foi possível carregar o banco genético: " + (erroSemen?.message || erroEmbrioes?.message));
  }

  const semen: TouroComEstoque[] = (semenRaw ?? []).map((s) => {
    const touro = primeiro(
      s.animais as
        | { nome: string | null; brinco: string | null; tatuagem: string | null; especie: Especie; origem_registro: string }
        | { nome: string | null; brinco: string | null; tatuagem: string | null; especie: Especie; origem_registro: string }[]
        | null,
    );
    return {
      touro_id: s.touro_id,
      identificacao: identificacao(touro),
      especie: touro?.especie ?? "bovino",
      externo: touro?.origem_registro === "externo",
      quantidade_doses: s.quantidade_doses,
      observacoes: s.observacoes,
    };
  });

  const embrioes: LoteEmbriao[] = (embrioesRaw ?? []).map((l) => {
    const doadora = primeiro(
      l.doadora as
        | { nome: string | null; brinco: string | null; tatuagem: string | null; origem_registro: string }
        | { nome: string | null; brinco: string | null; tatuagem: string | null; origem_registro: string }[]
        | null,
    );
    const touro = primeiro(
      l.touro as
        | { nome: string | null; brinco: string | null; tatuagem: string | null; origem_registro: string }
        | { nome: string | null; brinco: string | null; tatuagem: string | null; origem_registro: string }[]
        | null,
    );
    return {
      id: l.id,
      especie: l.especie as Especie,
      doadora_id: l.doadora_id,
      doadora_identificacao: identificacao(doadora),
      doadora_externa: doadora?.origem_registro === "externo",
      touro_id: l.touro_id,
      touro_identificacao: identificacao(touro),
      touro_externo: touro?.origem_registro === "externo",
      quantidade: l.quantidade,
      data_producao: l.data_producao,
      observacoes: l.observacoes,
    };
  });

  return (
    <div className="flex flex-1 flex-col gap-4">
      <PainelBancoGenetico
        localId={localId}
        semen={semen}
        embrioes={embrioes}
        candidatos={candidatos}
        podeEditar={podeGerenciarConteudo(local.perfil)}
      />
    </div>
  );
}
