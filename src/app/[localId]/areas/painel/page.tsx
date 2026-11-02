import { buscarLocalAtual, podeGerenciarConteudo } from "@/lib/local";
import { criarClienteServidor } from "@/lib/supabase/server";
import { carregarDadosPainelAreas } from "@/lib/painel-areas";
import { PainelAreas } from "./painel-areas";

export type {
  Especie,
  Area,
  AnimalResumo,
  MorteResumo,
  MovimentacaoResumo,
  ManejoResumo,
  CicloAtivo,
} from "@/lib/painel-areas";

export default async function PainelAreasPage({
  params,
}: {
  params: Promise<{ localId: string }>;
}) {
  const { localId } = await params;
  const local = await buscarLocalAtual(localId);
  const podeEditar = podeGerenciarConteudo(local.perfil);

  const supabase = await criarClienteServidor();
  const dados = await carregarDadosPainelAreas(supabase, localId);

  return (
    <div className="flex flex-1 flex-col gap-4">
      <PainelAreas localId={localId} {...dados} podeEditar={podeEditar} />
    </div>
  );
}
