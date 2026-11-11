import { buscarLocalAtual } from "@/lib/local";
import { criarClienteServidor } from "@/lib/supabase/server";
import { PainelRelatorios } from "./painel-relatorios";

export type CicloOpcao = { id: string; nome: string; data_inicio: string; data_fim: string | null; ativo: boolean };
export type AreaOpcao = { id: string; nome: string };

export default async function RelatoriosPage({ params }: { params: Promise<{ localId: string }> }) {
  const { localId } = await params;
  const local = await buscarLocalAtual(localId);
  const supabase = await criarClienteServidor();

  const [{ data: ciclos, error: erroCiclos }, { data: areas, error: erroAreas }] = await Promise.all([
    supabase
      .from("ciclos")
      .select("id, nome, data_inicio, data_fim, ativo")
      .eq("local_id", localId)
      .order("data_inicio", { ascending: false }),
    supabase.from("areas").select("id, nome").eq("local_id", localId).eq("ativo", true).order("ordem").order("nome"),
  ]);
  if (erroCiclos || erroAreas) {
    throw new Error("Não foi possível carregar os relatórios: " + (erroCiclos?.message || erroAreas?.message));
  }

  return (
    <PainelRelatorios
      localId={localId}
      localNome={local.nome}
      ciclos={(ciclos as CicloOpcao[]) ?? []}
      areas={(areas as AreaOpcao[]) ?? []}
    />
  );
}
