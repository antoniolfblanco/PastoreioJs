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

export default async function EventosReprodutivosPage({
  params,
}: {
  params: Promise<{ localId: string }>;
}) {
  const { localId } = await params;
  const local = await buscarLocalAtual(localId);

  const supabase = await criarClienteServidor();
  const [{ data: estacoes, error: erroEstacoes }, { data: eventos, error: erroEventos }] = await Promise.all([
    supabase.from("estacoes_reprodutivas").select("id, nome, ativo, especie").eq("local_id", localId),
    supabase
      .from("eventos_reprodutivos")
      .select("id, estacao_id, nome, metodo, especie, data_inicio")
      .eq("local_id", localId)
      .order("data_inicio", { ascending: false }),
  ]);

  if (erroEstacoes || erroEventos) {
    throw new Error("Não foi possível carregar os eventos reprodutivos: " + (erroEstacoes?.message || erroEventos?.message));
  }

  return (
    <div className="flex flex-1 flex-col gap-4">
      <ListaEventos
        localId={localId}
        estacoes={(estacoes as Estacao[]) ?? []}
        eventos={(eventos as Evento[]) ?? []}
        podeEditar={podeGerenciarConteudo(local.perfil)}
      />
    </div>
  );
}
