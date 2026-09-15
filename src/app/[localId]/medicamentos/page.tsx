import { buscarLocalAtual, podeGerenciarConteudo } from "@/lib/local";
import { criarClienteServidor } from "@/lib/supabase/server";
import { ListaMedicamentos } from "./lista-medicamentos";

export type Medicamento = {
  id: string;
  descricao: string;
  marca: string | null;
  principio_ativo: string | null;
  dosagem: string | null;
  observacoes: string | null;
  ativo: boolean;
};

export default async function MedicamentosPage({
  params,
}: {
  params: Promise<{ localId: string }>;
}) {
  const { localId } = await params;
  const local = await buscarLocalAtual(localId);

  const supabase = await criarClienteServidor();
  const { data: medicamentos } = await supabase
    .from("medicamentos")
    .select("id, descricao, marca, principio_ativo, dosagem, observacoes, ativo")
    .eq("local_id", localId)
    .order("descricao");

  return (
    <div className="flex flex-1 flex-col gap-4">
      <div>
        <h1 className="text-xl font-semibold">Medicamentos</h1>
        <p className="text-sm text-muted-foreground">
          Medicamentos e vacinas disponíveis para uso nos manejos sanitários.
        </p>
      </div>
      <ListaMedicamentos
        localId={localId}
        medicamentos={(medicamentos as Medicamento[]) ?? []}
        podeEditar={podeGerenciarConteudo(local.perfil)}
      />
    </div>
  );
}
