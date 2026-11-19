import { buscarLocalAtual, podeGerenciarConteudo } from "@/lib/local";
import { criarClienteServidor } from "@/lib/supabase/server";
import { buscarAnimaisSelecionaveis, buscarCicloAtivo } from "@/lib/animais-selecionaveis";
import { HistoricoTransferencias } from "./historico-transferencias";
import { PendentesRecebidas } from "./pendentes-recebidas";
import { NovaTransferencia } from "./nova-transferencia";
import { EntradaExterna } from "./entrada-externa";

export type Especie = "bovino" | "ovino" | "equino";
export type Direcao = "enviada" | "recebida";
export type StatusTransferencia = "pendente" | "confirmada" | "recusada";

export type AnimalTransferencia = {
  id: string;
  nome: string | null;
  brinco: string | null;
  tatuagem: string | null;
  especie: Especie;
  categoria_descricao: string;
  area_nome: string | null;
  // Enviada: valor de saída (valor_atual na origem). Recebida: valor de entrada.
  valor: number | null;
};

export type Transferencia = {
  id: string;
  direcao: Direcao;
  outroNome: string;
  externa: boolean;
  data: string;
  status: StatusTransferencia;
  responsavel: string | null;
  descricao: string | null;
  observacoes: string | null;
  motivo_recusa: string | null;
  criado_em: string;
  especie: Especie | null;
  animais: AnimalTransferencia[];
};

export type OpcaoLocal = { id: string; nome: string };
export type OpcaoArea = { id: string; nome: string };
export type OpcaoCategoria = { id: string; descricao: string; especie: Especie };
export type OpcaoRaca = { id: string; descricao: string; padrao: boolean };

function primeiro<T>(valor: T | T[] | null): T | null {
  return Array.isArray(valor) ? (valor[0] ?? null) : valor;
}

type LinhaAnimal = {
  id: string;
  nome: string | null;
  brinco: string | null;
  tatuagem: string | null;
  especie: Especie;
  valor: number | null;
  valor_atual: number | null;
  transferencia_id: string | null;
  transferencia_entrada_id: string | null;
  categorias: { descricao: string } | { descricao: string }[] | null;
  areas: { nome: string } | { nome: string }[] | null;
};

export default async function TransferenciasPage({ params }: { params: Promise<{ localId: string }> }) {
  const { localId } = await params;
  const local = await buscarLocalAtual(localId);
  const podeEditar = podeGerenciarConteudo(local.perfil);
  const supabase = await criarClienteServidor();

  const camposAnimal = `id, nome, brinco, tatuagem, especie, valor, valor_atual, transferencia_id, transferencia_entrada_id,
    categorias!categoria_id(descricao), areas(nome)`;

  const [
    animaisAtivos,
    ciclo,
    { data: transferenciasRaw, error: erroTransf },
    { data: enviadosRaw, error: erroEnviados },
    { data: recebidosRaw, error: erroRecebidos },
    { data: meusLocais },
    { data: areas },
    { data: categorias },
    { data: racas },
  ] = await Promise.all([
    buscarAnimaisSelecionaveis(supabase, localId),
    buscarCicloAtivo(supabase, localId),
    supabase
      .from("transferencias_detalhe")
      .select(
        "id, local_origem_id, local_destino_id, local_origem_nome, local_destino_nome, origem_externa, destino_externo, data, status, responsavel, observacoes, motivo_recusa, criado_em",
      )
      .or(`local_origem_id.eq.${localId},local_destino_id.eq.${localId}`)
      .order("criado_em", { ascending: false }),
    supabase.from("animais").select(camposAnimal).eq("local_id", localId).not("transferencia_id", "is", null),
    supabase.from("animais").select(camposAnimal).eq("local_id", localId).not("transferencia_entrada_id", "is", null),
    supabase.from("usuario_locais").select("locais(id, nome)"),
    supabase.from("areas").select("id, nome").eq("local_id", localId).eq("ativo", true).order("ordem").order("nome"),
    supabase
      .from("categorias")
      .select("id, descricao, especie")
      .eq("local_id", localId)
      .eq("ativo", true)
      .order("ordem")
      .order("descricao"),
    supabase.from("racas").select("id, descricao, padrao").eq("local_id", localId).eq("ativo", true).order("descricao"),
  ]);

  if (erroTransf || erroEnviados || erroRecebidos) {
    throw new Error(
      "Não foi possível carregar as transferências: " +
        (erroTransf?.message || erroEnviados?.message || erroRecebidos?.message),
    );
  }

  // A descrição não está na view; vem da tabela.
  const ids = (transferenciasRaw ?? []).map((t) => t.id as string);
  const { data: descricoes } = ids.length
    ? await supabase.from("transferencias").select("id, descricao").in("id", ids)
    : { data: [] as { id: string; descricao: string | null }[] };
  const descricaoPorId = new Map((descricoes ?? []).map((d) => [d.id as string, d.descricao as string | null]));

  function paraAnimal(a: LinhaAnimal, saida: boolean): AnimalTransferencia {
    return {
      id: a.id,
      nome: a.nome,
      brinco: a.brinco,
      tatuagem: a.tatuagem,
      especie: a.especie,
      categoria_descricao: primeiro(a.categorias)?.descricao ?? "Sem categoria",
      area_nome: primeiro(a.areas)?.nome ?? null,
      valor: saida ? (a.valor_atual ?? a.valor) : a.valor,
    };
  }

  const enviadosPorTransf = new Map<string, AnimalTransferencia[]>();
  for (const a of (enviadosRaw ?? []) as LinhaAnimal[]) {
    const lista = enviadosPorTransf.get(a.transferencia_id!) ?? [];
    lista.push(paraAnimal(a, true));
    enviadosPorTransf.set(a.transferencia_id!, lista);
  }
  const recebidosPorTransf = new Map<string, AnimalTransferencia[]>();
  for (const a of (recebidosRaw ?? []) as LinhaAnimal[]) {
    const lista = recebidosPorTransf.get(a.transferencia_entrada_id!) ?? [];
    lista.push(paraAnimal(a, false));
    recebidosPorTransf.set(a.transferencia_entrada_id!, lista);
  }

  // Recebidas ainda não confirmadas: os animais estão na origem (outro local,
  // que a RLS pode esconder) — vêm pela RPC de detalhe.
  const pendentesRecebidasIds = (transferenciasRaw ?? [])
    .filter((t) => t.local_destino_id === localId && t.status !== "confirmada")
    .map((t) => t.id as string);
  const detalhes = await Promise.all(
    pendentesRecebidasIds.map((id) => supabase.rpc("detalhe_transferencia", { p_transferencia_id: id })),
  );
  pendentesRecebidasIds.forEach((id, i) => {
    const linhas = (detalhes[i].data ?? []) as {
      animal_id: string;
      nome: string | null;
      brinco: string | null;
      tatuagem: string | null;
      especie: Especie;
    }[];
    recebidosPorTransf.set(
      id,
      linhas.map((l) => ({
        id: l.animal_id,
        nome: l.nome,
        brinco: l.brinco,
        tatuagem: l.tatuagem,
        especie: l.especie,
        categoria_descricao: "A definir",
        area_nome: null,
        valor: null,
      })),
    );
  });

  const transferencias: Transferencia[] = (transferenciasRaw ?? []).map((t) => {
    const direcao: Direcao = t.local_origem_id === localId ? "enviada" : "recebida";
    const animais = (direcao === "enviada" ? enviadosPorTransf : recebidosPorTransf).get(t.id) ?? [];
    return {
      id: t.id,
      direcao,
      outroNome: (direcao === "enviada" ? t.local_destino_nome : t.local_origem_nome) ?? "Outra propriedade",
      externa: direcao === "enviada" ? !t.local_destino_id : !t.local_origem_id,
      data: t.data,
      status: t.status as StatusTransferencia,
      responsavel: t.responsavel,
      descricao: descricaoPorId.get(t.id) ?? null,
      observacoes: t.observacoes,
      motivo_recusa: t.motivo_recusa,
      criado_em: t.criado_em,
      especie: animais[0]?.especie ?? null,
      animais,
    };
  });

  const outrosLocais: OpcaoLocal[] = (meusLocais ?? [])
    .map((ul) => primeiro(ul.locais as OpcaoLocal | OpcaoLocal[] | null))
    .filter((l): l is OpcaoLocal => !!l && l.id !== localId)
    .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));

  const pendentes = transferencias.filter((t) => t.direcao === "recebida" && t.status === "pendente");

  return (
    <div className="flex flex-1 flex-col gap-6">
      {podeEditar && pendentes.length > 0 && (
        <PendentesRecebidas
          localId={localId}
          pendentes={pendentes}
          areas={(areas as OpcaoArea[]) ?? []}
          categorias={(categorias as OpcaoCategoria[]) ?? []}
          racas={(racas as OpcaoRaca[]) ?? []}
        />
      )}
      <HistoricoTransferencias transferencias={transferencias} ciclo={ciclo} localCodigo={local.codigo} />
      {podeEditar && (
        <div className="flex flex-col gap-4">
          <NovaTransferencia localId={localId} animais={animaisAtivos} outrosLocais={outrosLocais} />
          <EntradaExterna
            localId={localId}
            areas={(areas as OpcaoArea[]) ?? []}
            categorias={(categorias as OpcaoCategoria[]) ?? []}
            racas={(racas as OpcaoRaca[]) ?? []}
          />
        </div>
      )}
    </div>
  );
}
