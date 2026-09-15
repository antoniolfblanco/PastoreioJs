import { buscarLocalAtual, podeGerenciarConteudo } from "@/lib/local";
import { criarClienteServidor } from "@/lib/supabase/server";
import { ListaEstacoes } from "./lista-estacoes";

export type Especie = "bovino" | "ovino" | "equino";

export type Estacao = {
  id: string;
  nome: string;
  data_inicio: string;
  data_fim: string | null;
  ativo: boolean;
  especie: Especie | null;
};

export default async function EstacoesReprodutivasPage({
  params,
}: {
  params: Promise<{ localId: string }>;
}) {
  const { localId } = await params;
  const local = await buscarLocalAtual(localId);

  const supabase = await criarClienteServidor();
  const { data: estacoes } = await supabase
    .from("estacoes_reprodutivas")
    .select("id, nome, data_inicio, data_fim, ativo, especie")
    .eq("local_id", localId)
    .order("data_inicio", { ascending: false });

  return (
    <div className="flex flex-1 flex-col gap-4">
      <ListaEstacoes
        localId={localId}
        estacoes={(estacoes as Estacao[]) ?? []}
        podeEditar={podeGerenciarConteudo(local.perfil)}
      />
    </div>
  );
}
