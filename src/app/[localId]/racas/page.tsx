import { buscarLocalAtual, podeGerenciarConteudo } from "@/lib/local";
import { criarClienteServidor } from "@/lib/supabase/server";
import { ListaRacas } from "./lista-racas";

export type Raca = {
  id: string;
  descricao: string;
  observacoes: string | null;
  ativo: boolean;
  padrao: boolean;
};

export default async function RacasPage({
  params,
}: {
  params: Promise<{ localId: string }>;
}) {
  const { localId } = await params;
  const local = await buscarLocalAtual(localId);

  const supabase = await criarClienteServidor();
  const { data: racas } = await supabase
    .from("racas")
    .select("id, descricao, observacoes, ativo, padrao")
    .eq("local_id", localId)
    .order("descricao");

  return (
    <div className="flex flex-1 flex-col gap-4">
      <div>
        <h1 className="text-xl font-semibold">Raças</h1>
        <p className="text-sm text-muted-foreground">
          Raças disponíveis para o cadastro de animais deste local.
        </p>
      </div>
      <ListaRacas
        localId={localId}
        racas={(racas as Raca[]) ?? []}
        podeEditar={podeGerenciarConteudo(local.perfil)}
      />
    </div>
  );
}
