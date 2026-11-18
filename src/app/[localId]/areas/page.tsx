import { buscarLocalAtual, podeGerenciarConteudo } from "@/lib/local";
import { criarClienteServidor } from "@/lib/supabase/server";
import { ListaAreas } from "./lista-areas";

export type Area = {
  id: string;
  nome: string;
  tipo: string | null;
  tamanho: number | null;
  observacoes: string | null;
  ordem: number;
  ativo: boolean;
  grupo_id: string | null;
};

export type GrupoArea = { id: string; nome: string };

export default async function AreasPage({
  params,
}: {
  params: Promise<{ localId: string }>;
}) {
  const { localId } = await params;
  const local = await buscarLocalAtual(localId);

  const supabase = await criarClienteServidor();
  const [{ data: areas }, { data: grupos }] = await Promise.all([
    supabase
      .from("areas")
      .select("id, nome, tipo, tamanho, observacoes, ordem, ativo, grupo_id")
      .eq("local_id", localId)
      .order("ordem")
      .order("nome"),
    supabase.from("grupos_area").select("id, nome").eq("local_id", localId).order("ordem").order("nome"),
  ]);

  return (
    <div className="flex flex-1 flex-col gap-4">
      <div>
        <h1 className="text-xl font-semibold">Áreas</h1>
        <p className="text-sm text-muted-foreground">
          Piquetes, mangueiras e demais divisões do local — todo animal fica em uma delas.
        </p>
      </div>
      <ListaAreas
        localId={localId}
        areas={(areas as Area[]) ?? []}
        grupos={(grupos as GrupoArea[]) ?? []}
        podeEditar={podeGerenciarConteudo(local.perfil)}
      />
    </div>
  );
}
