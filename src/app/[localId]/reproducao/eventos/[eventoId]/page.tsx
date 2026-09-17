import { notFound } from "next/navigation";
import { buscarLocalAtual, podeGerenciarConteudo } from "@/lib/local";
import { criarClienteServidor } from "@/lib/supabase/server";
import { PainelEvento } from "./painel-evento";

export type Especie = "bovino" | "ovino" | "equino";
export type Sexo = "macho" | "femea" | "desconhecido";
export type Metodo = "monta_natural" | "inseminacao_artificial" | "te_fiv";
export type ResultadoDiagnostico = "prenha" | "vazia" | "inconclusivo";
export type CertezaDiagnostico = "certo" | "provavel";

export type Evento = {
  id: string;
  nome: string;
  metodo: Metodo;
  especie: Especie;
  data_inicio: string;
  estacao_id: string;
  estacao_nome: string;
};

export type Participante = {
  id: string;
  femeaId: string;
  identificacao: string;
  confirmada: boolean;
  doadoraNome: string | null;
  touroNome: string | null;
  rmLoteNome: string | null;
  data: string;
  responsavel: string | null;
  ultimoDiagnosticoResultado: ResultadoDiagnostico | null;
  ultimoDiagnosticoCerteza: CertezaDiagnostico | null;
  ultimoDiagnosticoData: string | null;
  pariu: boolean;
};

// Pool de candidatos: próprios ativos + externos (touro de sêmen etc.),
// filtrado por sexo/espécie na hora de usar (fêmea pra participante, macho
// pra confirmar acasalamento).
export type CandidatoAnimal = {
  id: string;
  nome: string | null;
  brinco: string | null;
  tatuagem: string | null;
  sexo: Sexo;
  especie: Especie;
  externo: boolean;
};

export type LoteRmOpcao = { id: string; nome: string };

export type LoteEmbriaoOpcao = {
  id: string;
  doadoraIdentificacao: string;
  touroIdentificacao: string;
  quantidade: number;
};

function primeiro<T>(valor: T | T[] | null): T | null {
  return Array.isArray(valor) ? (valor[0] ?? null) : valor;
}

function identificacao(a: { nome: string | null; brinco: string | null; tatuagem: string | null } | null) {
  if (!a) return "—";
  return [a.brinco, a.tatuagem, a.nome].filter(Boolean).join(" • ") || "Sem identificação";
}

export default async function EventoReprodutivoDetalhePage({
  params,
}: {
  params: Promise<{ localId: string; eventoId: string }>;
}) {
  const { localId, eventoId } = await params;
  const local = await buscarLocalAtual(localId);

  const supabase = await criarClienteServidor();
  const { data: eventoRaw, error: erroEvento } = await supabase
    .from("eventos_reprodutivos")
    .select("id, nome, metodo, especie, data_inicio, estacao_id, estacoes_reprodutivas(nome)")
    .eq("id", eventoId)
    .eq("local_id", localId)
    .maybeSingle();

  if (erroEvento) throw new Error("Não foi possível carregar o evento: " + erroEvento.message);
  if (!eventoRaw) notFound();

  const evento: Evento = {
    id: eventoRaw.id,
    nome: eventoRaw.nome,
    metodo: eventoRaw.metodo as Metodo,
    especie: eventoRaw.especie as Especie,
    data_inicio: eventoRaw.data_inicio,
    estacao_id: eventoRaw.estacao_id,
    estacao_nome:
      primeiro(eventoRaw.estacoes_reprodutivas as { nome: string } | { nome: string }[] | null)?.nome ?? "—",
  };

  const [
    { data: coberturasRaw, error: erroCoberturas },
    { data: lotesRmRaw, error: erroLotesRm },
    { data: embrioesRaw, error: erroEmbrioes },
    proprios,
    externos,
  ] = await Promise.all([
    supabase
      .from("coberturas_detalhe")
      .select(
        "id, femea_id, femea_nome, femea_brinco, femea_tatuagem, receptora_id, receptora_nome, receptora_brinco, receptora_tatuagem, touro_nome, rm_lote_nome, confirmada, data, responsavel, ultimo_diagnostico_resultado, ultimo_diagnostico_certeza, ultimo_diagnostico_data, pariu",
      )
      .eq("evento_id", eventoId)
      // "id" como critério de desempate: coberturas do mesmo lote nascem
      // com o mesmo criado_em (mesma instrução INSERT...SELECT), e sem uma
      // segunda coluna de ordenação o Postgres pode devolver empates em
      // ordem diferente a cada consulta — a linha confirmada "pulava" pra
      // outra posição na tabela a cada UPDATE.
      .order("criado_em", { ascending: false })
      .order("id", { ascending: true }),
    supabase.from("lotes_rm").select("id, nome").eq("local_id", localId).eq("ativo", true).order("nome"),
    supabase
      .from("banco_embrioes")
      .select(
        `id, quantidade,
         doadora:animais!doadora_id(nome, brinco, tatuagem),
         touro:animais!touro_id(nome, brinco, tatuagem)`,
      )
      .eq("local_id", localId)
      .eq("especie", evento.especie)
      .gt("quantidade", 0)
      .order("criado_em", { ascending: false }),
    supabase
      .from("animais")
      .select("id, nome, brinco, tatuagem, sexo, especie")
      .eq("local_id", localId)
      .eq("origem_registro", "proprio")
      .eq("situacao", "ativo"),
    supabase.from("animais").select("id, nome, brinco, tatuagem, sexo, especie").eq("local_id", localId).eq("origem_registro", "externo"),
  ]);

  if (erroCoberturas || erroLotesRm || erroEmbrioes || proprios.error || externos.error) {
    throw new Error(
      "Não foi possível carregar o evento: " +
        (erroCoberturas?.message ||
          erroLotesRm?.message ||
          erroEmbrioes?.message ||
          proprios.error?.message ||
          externos.error?.message),
    );
  }

  const participantes: Participante[] = (coberturasRaw ?? []).map((c) => {
    const sujeito = c.receptora_id
      ? { id: c.receptora_id, nome: c.receptora_nome, brinco: c.receptora_brinco, tatuagem: c.receptora_tatuagem }
      : { id: c.femea_id, nome: c.femea_nome, brinco: c.femea_brinco, tatuagem: c.femea_tatuagem };

    return {
      id: c.id,
      femeaId: sujeito.id,
      identificacao: identificacao(sujeito),
      confirmada: c.confirmada,
      doadoraNome: c.femea_id
        ? identificacao({ nome: c.femea_nome, brinco: c.femea_brinco, tatuagem: c.femea_tatuagem })
        : null,
      touroNome: c.touro_nome,
      rmLoteNome: c.rm_lote_nome,
      data: c.data,
      responsavel: c.responsavel,
      ultimoDiagnosticoResultado: c.ultimo_diagnostico_resultado as ResultadoDiagnostico | null,
      ultimoDiagnosticoCerteza: c.ultimo_diagnostico_certeza as CertezaDiagnostico | null,
      ultimoDiagnosticoData: c.ultimo_diagnostico_data,
      pariu: c.pariu,
    };
  });

  const candidatos: CandidatoAnimal[] = [
    ...(proprios.data ?? []).map((a) => ({ ...a, sexo: a.sexo as Sexo, especie: a.especie as Especie, externo: false })),
    ...(externos.data ?? []).map((a) => ({ ...a, sexo: a.sexo as Sexo, especie: a.especie as Especie, externo: true })),
  ];

  const lotesEmbriao: LoteEmbriaoOpcao[] = (embrioesRaw ?? []).map((l) => ({
    id: l.id,
    doadoraIdentificacao: identificacao(
      primeiro(l.doadora as { nome: string | null; brinco: string | null; tatuagem: string | null } | { nome: string | null; brinco: string | null; tatuagem: string | null }[] | null),
    ),
    touroIdentificacao: identificacao(
      primeiro(l.touro as { nome: string | null; brinco: string | null; tatuagem: string | null } | { nome: string | null; brinco: string | null; tatuagem: string | null }[] | null),
    ),
    quantidade: l.quantidade,
  }));

  return (
    <div className="flex flex-1 flex-col gap-4">
      <PainelEvento
        localId={localId}
        evento={evento}
        participantes={participantes}
        candidatos={candidatos}
        lotesRm={(lotesRmRaw as LoteRmOpcao[]) ?? []}
        lotesEmbriao={lotesEmbriao}
        podeEditar={podeGerenciarConteudo(local.perfil)}
      />
    </div>
  );
}
