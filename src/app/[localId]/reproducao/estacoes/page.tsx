import { buscarLocalAtual, podeGerenciarConteudo } from "@/lib/local";
import { criarClienteServidor } from "@/lib/supabase/server";
import { ListaEstacoes } from "./lista-estacoes";

export type Especie = "bovino" | "ovino" | "equino";
export type Metodo = "monta_natural" | "inseminacao_artificial" | "te_fiv";
export type ResultadoDiagnostico = "prenha" | "vazia" | "inconclusivo";

export type EventoResumo = {
  id: string;
  nome: string;
  metodo: Metodo;
  dataInicio: string;
  // Para monta natural/IA: nº de vacas cobertas (fêmea física exposta).
  // Para TE/FIV: nº de embriões transferidos (uma receptora por embrião).
  totalSujeitos: number;
  diagnosticados: number;
  prenhes: number;
  vazias: number;
  inconclusivos: number;
};

export type Estacao = {
  id: string;
  nome: string;
  data_inicio: string;
  data_fim: string | null;
  ativo: boolean;
  especie: Especie | null;
  eventos: EventoResumo[];
  // Totais da estação: cada vaca conta só uma vez, mesmo se participou de
  // mais de um evento (ex.: repasse) — nunca é a soma dos eventos.
  totalVacas: number;
  totalDiagnosticadas: number;
  totalPrenhes: number;
  totalVazias: number;
  totalInconclusivos: number;
  totalEmbrioesTransferidos: number;
};

type LinhaCobertura = {
  evento_id: string;
  estacao_id: string;
  metodo: Metodo;
  femea_id: string;
  receptora_id: string | null;
  ultimo_diagnostico_resultado: ResultadoDiagnostico | null;
  ultimo_diagnostico_data: string | null;
};

// Quem fisicamente carrega a gestação: a receptora em TE/FIV, senão a
// própria fêmea coberta — é o "indivíduo" que os totais contam.
function sujeito(linha: LinhaCobertura) {
  return linha.receptora_id ?? linha.femea_id;
}

export default async function EstacoesReprodutivasPage({
  params,
}: {
  params: Promise<{ localId: string }>;
}) {
  const { localId } = await params;
  const local = await buscarLocalAtual(localId);

  const supabase = await criarClienteServidor();
  const [{ data: estacoesRaw, error: erroEstacoes }, { data: eventosRaw, error: erroEventos }, { data: coberturasRaw, error: erroCoberturas }] =
    await Promise.all([
      supabase
        .from("estacoes_reprodutivas")
        .select("id, nome, data_inicio, data_fim, ativo, especie")
        .eq("local_id", localId)
        .order("data_inicio", { ascending: false }),
      supabase
        .from("eventos_reprodutivos")
        .select("id, estacao_id, nome, metodo, data_inicio")
        .eq("local_id", localId),
      supabase
        .from("coberturas_detalhe")
        .select("evento_id, estacao_id, metodo, femea_id, receptora_id, ultimo_diagnostico_resultado, ultimo_diagnostico_data")
        .eq("local_id", localId),
    ]);

  if (erroEstacoes || erroEventos || erroCoberturas) {
    throw new Error(
      "Não foi possível carregar as estações reprodutivas: " +
        (erroEstacoes?.message || erroEventos?.message || erroCoberturas?.message),
    );
  }

  const coberturasPorEvento = new Map<string, LinhaCobertura[]>();
  const coberturasPorEstacao = new Map<string, LinhaCobertura[]>();
  for (const linha of (coberturasRaw ?? []) as LinhaCobertura[]) {
    const listaEvento = coberturasPorEvento.get(linha.evento_id) ?? [];
    listaEvento.push(linha);
    coberturasPorEvento.set(linha.evento_id, listaEvento);

    const listaEstacao = coberturasPorEstacao.get(linha.estacao_id) ?? [];
    listaEstacao.push(linha);
    coberturasPorEstacao.set(linha.estacao_id, listaEstacao);
  }

  function resumoPorSujeito(linhas: LinhaCobertura[]) {
    // Uma vaca com mais de uma cobertura no mesmo escopo (ex.: repasse)
    // conta pelo diagnóstico mais recente entre elas, não pelas duas.
    const porSujeito = new Map<string, LinhaCobertura>();
    for (const linha of linhas) {
      const id = sujeito(linha);
      const atual = porSujeito.get(id);
      if (!atual) {
        porSujeito.set(id, linha);
        continue;
      }
      const dataAtual = atual.ultimo_diagnostico_data;
      const dataNova = linha.ultimo_diagnostico_data;
      if (dataNova && (!dataAtual || dataNova > dataAtual)) porSujeito.set(id, linha);
    }

    let diagnosticados = 0;
    let prenhes = 0;
    let vazias = 0;
    let inconclusivos = 0;
    for (const linha of porSujeito.values()) {
      if (!linha.ultimo_diagnostico_resultado) continue;
      diagnosticados++;
      if (linha.ultimo_diagnostico_resultado === "prenha") prenhes++;
      else if (linha.ultimo_diagnostico_resultado === "vazia") vazias++;
      else if (linha.ultimo_diagnostico_resultado === "inconclusivo") inconclusivos++;
    }

    return { totalSujeitos: porSujeito.size, diagnosticados, prenhes, vazias, inconclusivos };
  }

  const eventosPorEstacao = new Map<string, EventoResumo[]>();
  for (const ev of eventosRaw ?? []) {
    const linhas = coberturasPorEvento.get(ev.id) ?? [];
    const resumo = resumoPorSujeito(linhas);
    const lista = eventosPorEstacao.get(ev.estacao_id) ?? [];
    lista.push({
      id: ev.id,
      nome: ev.nome,
      metodo: ev.metodo as Metodo,
      dataInicio: ev.data_inicio,
      ...resumo,
    });
    eventosPorEstacao.set(ev.estacao_id, lista);
  }

  const estacoes: Estacao[] = (estacoesRaw ?? []).map((e) => {
    const eventos = (eventosPorEstacao.get(e.id) ?? []).sort((a, b) => (a.dataInicio < b.dataInicio ? 1 : -1));
    const linhasEstacao = coberturasPorEstacao.get(e.id) ?? [];
    const totalEstacao = resumoPorSujeito(linhasEstacao);
    const totalEmbrioesTransferidos = linhasEstacao.filter((l) => l.metodo === "te_fiv").length;

    return {
      id: e.id,
      nome: e.nome,
      data_inicio: e.data_inicio,
      data_fim: e.data_fim,
      ativo: e.ativo,
      especie: e.especie as Especie | null,
      eventos,
      totalVacas: totalEstacao.totalSujeitos,
      totalDiagnosticadas: totalEstacao.diagnosticados,
      totalPrenhes: totalEstacao.prenhes,
      totalVazias: totalEstacao.vazias,
      totalInconclusivos: totalEstacao.inconclusivos,
      totalEmbrioesTransferidos,
    };
  });

  return (
    <div className="flex flex-1 flex-col gap-4">
      <ListaEstacoes localId={localId} estacoes={estacoes} podeEditar={podeGerenciarConteudo(local.perfil)} />
    </div>
  );
}
