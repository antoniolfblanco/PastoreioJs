import { buscarLocalAtual, podeGerenciarConteudo } from "@/lib/local";
import { criarClienteServidor } from "@/lib/supabase/server";
import { ListaCiclos } from "./lista-ciclos";

export type Ciclo = {
  id: string;
  nome: string;
  data_inicio: string;
  data_fim: string | null;
  ativo: boolean;
  estoque_inicial_bovino: number;
  estoque_inicial_ovino: number;
  estoque_inicial_equino: number;
  estoque_final_bovino: number | null;
  estoque_final_ovino: number | null;
  estoque_final_equino: number | null;
  valor_inicial_bovino: number | null;
  valor_inicial_ovino: number | null;
  valor_inicial_equino: number | null;
  valor_final_bovino: number | null;
  valor_final_ovino: number | null;
  valor_final_equino: number | null;
};

export default async function CiclosPage({ params }: { params: Promise<{ localId: string }> }) {
  const { localId } = await params;
  const local = await buscarLocalAtual(localId);
  const supabase = await criarClienteServidor();

  const { data, error } = await supabase
    .from("ciclos")
    .select(
      `id, nome, data_inicio, data_fim, ativo,
       estoque_inicial_bovino, estoque_inicial_ovino, estoque_inicial_equino,
       estoque_final_bovino, estoque_final_ovino, estoque_final_equino,
       valor_inicial_bovino, valor_inicial_ovino, valor_inicial_equino,
       valor_final_bovino, valor_final_ovino, valor_final_equino`,
    )
    .eq("local_id", localId)
    .order("data_inicio", { ascending: false });
  if (error) throw new Error("Não foi possível carregar os ciclos: " + error.message);

  const ciclos = (data ?? []).map((c) => {
    const n = (v: unknown) => (v == null ? null : Number(v));
    return {
      ...c,
      valor_inicial_bovino: n(c.valor_inicial_bovino),
      valor_inicial_ovino: n(c.valor_inicial_ovino),
      valor_inicial_equino: n(c.valor_inicial_equino),
      valor_final_bovino: n(c.valor_final_bovino),
      valor_final_ovino: n(c.valor_final_ovino),
      valor_final_equino: n(c.valor_final_equino),
    };
  }) as Ciclo[];

  return <ListaCiclos localId={localId} ciclos={ciclos} podeEditar={podeGerenciarConteudo(local.perfil)} />;
}
