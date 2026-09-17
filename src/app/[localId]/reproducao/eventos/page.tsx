import { buscarLocalAtual, podeGerenciarConteudo } from "@/lib/local";
import { criarClienteServidor } from "@/lib/supabase/server";
import { ListaEventos } from "./lista-eventos";

export type Especie = "bovino" | "ovino" | "equino";
export type Metodo = "monta_natural" | "inseminacao_artificial" | "te_fiv";

export type Estacao = {
  id: string;
  nome: string;
  ativo: boolean;
  especie: Especie | null;
};

export type Evento = {
  id: string;
  estacao_id: string;
  nome: string;
  metodo: Metodo;
  especie: Especie;
  data_inicio: string;
};

export type ResultadoDiagnostico = "prenha" | "vazia" | "inconclusivo";

export type FemeaDoEvento = {
  id: string;
  identificacao: string;
  acasalamento: string | null;
  confirmada: boolean;
  data: string;
  ultimoDiagnosticoResultado: ResultadoDiagnostico | null;
  ultimoDiagnosticoData: string | null;
  pariu: boolean;
};

function identificacao(a: { nome: string | null; brinco: string | null; tatuagem: string | null } | null) {
  if (!a) return "—";
  return [a.brinco, a.tatuagem, a.nome].filter(Boolean).join(" • ") || "Sem identificação";
}

export default async function EventosReprodutivosPage({
  params,
  searchParams,
}: {
  params: Promise<{ localId: string }>;
  searchParams: Promise<{ estacao?: string }>;
}) {
  const { localId } = await params;
  const { estacao } = await searchParams;
  const local = await buscarLocalAtual(localId);

  const supabase = await criarClienteServidor();
  const [
    { data: estacoes, error: erroEstacoes },
    { data: eventos, error: erroEventos },
    { data: coberturasRaw, error: erroCoberturas },
  ] = await Promise.all([
    supabase.from("estacoes_reprodutivas").select("id, nome, ativo, especie").eq("local_id", localId),
    supabase
      .from("eventos_reprodutivos")
      .select("id, estacao_id, nome, metodo, especie, data_inicio")
      .eq("local_id", localId)
      .order("data_inicio", { ascending: false }),
    supabase
      .from("coberturas_detalhe")
      .select(
        "id, evento_id, evento_metodo, receptora_id, receptora_nome, receptora_brinco, receptora_tatuagem, femea_id, femea_nome, femea_brinco, femea_tatuagem, touro_nome, rm_lote_nome, confirmada, data, ultimo_diagnostico_resultado, ultimo_diagnostico_data, pariu",
      )
      .eq("local_id", localId)
      // "id" como desempate: coberturas do mesmo lote têm o mesmo
      // criado_em (mesma instrução INSERT...SELECT); sem isso, confirmar
      // uma linha fazia ela "pular" de posição na tabela expandida.
      .order("criado_em", { ascending: false })
      .order("id", { ascending: true }),
  ]);

  if (erroEstacoes || erroEventos || erroCoberturas) {
    throw new Error(
      "Não foi possível carregar os eventos reprodutivos: " +
        (erroEstacoes?.message || erroEventos?.message || erroCoberturas?.message),
    );
  }

  const femeasPorEvento = new Map<string, FemeaDoEvento[]>();
  for (const c of coberturasRaw ?? []) {
    const sujeito = c.receptora_id
      ? { id: c.receptora_id, nome: c.receptora_nome, brinco: c.receptora_brinco, tatuagem: c.receptora_tatuagem }
      : { id: c.femea_id, nome: c.femea_nome, brinco: c.femea_brinco, tatuagem: c.femea_tatuagem };

    const lista = femeasPorEvento.get(c.evento_id) ?? [];
    lista.push({
      id: c.id,
      identificacao: identificacao(sujeito),
      acasalamento:
        c.evento_metodo === "te_fiv"
          ? c.touro_nome
            ? `${identificacao({ nome: c.femea_nome, brinco: c.femea_brinco, tatuagem: c.femea_tatuagem })} × ${c.touro_nome}`
            : null
          : (c.touro_nome ?? c.rm_lote_nome ?? null),
      confirmada: c.confirmada,
      data: c.data,
      ultimoDiagnosticoResultado: c.ultimo_diagnostico_resultado as ResultadoDiagnostico | null,
      ultimoDiagnosticoData: c.ultimo_diagnostico_data,
      pariu: c.pariu,
    });
    femeasPorEvento.set(c.evento_id, lista);
  }

  return (
    <div className="flex flex-1 flex-col gap-4">
      <ListaEventos
        localId={localId}
        estacoes={(estacoes as Estacao[]) ?? []}
        eventos={(eventos as Evento[]) ?? []}
        femeasPorEvento={Object.fromEntries(femeasPorEvento)}
        podeEditar={podeGerenciarConteudo(local.perfil)}
        estacaoInicialId={estacao}
      />
    </div>
  );
}
