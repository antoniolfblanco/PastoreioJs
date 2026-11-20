import { buscarLocalAtual, podeGerenciarConteudo } from "@/lib/local";
import { criarClienteServidor } from "@/lib/supabase/server";
import { ListaPelagens } from "./lista-pelagens";

export type Pelagem = {
  id: string;
  descricao: string;
  observacoes: string | null;
  ativo: boolean;
};

export default async function PelagensPage({ params }: { params: Promise<{ localId: string }> }) {
  const { localId } = await params;
  const local = await buscarLocalAtual(localId);

  const supabase = await criarClienteServidor();
  const { data: pelagens } = await supabase
    .from("pelagens")
    .select("id, descricao, observacoes, ativo")
    .eq("local_id", localId)
    .order("descricao");

  return (
    <div className="flex flex-1 flex-col gap-4">
      <div>
        <h1 className="text-xl font-semibold">Pelagens</h1>
        <p className="text-sm text-muted-foreground">
          Pelagens dos equinos deste local. Combinações (ex.: Gateada / Bragada) entram como uma pelagem própria.
        </p>
      </div>
      <ListaPelagens
        localId={localId}
        pelagens={(pelagens as Pelagem[]) ?? []}
        podeEditar={podeGerenciarConteudo(local.perfil)}
      />
    </div>
  );
}
