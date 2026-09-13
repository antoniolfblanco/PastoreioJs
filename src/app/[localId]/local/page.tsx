import { notFound } from "next/navigation";
import { buscarLocalAtual, ehGerente } from "@/lib/local";
import { criarClienteServidor } from "@/lib/supabase/server";
import { FormularioLocal } from "./formulario-local";
import { Membros } from "./membros";
import { SairOuApagarLocal } from "./sair-ou-apagar-local";

export type Local = {
  id: string;
  nome: string;
  codigo: string;
  tamanho: number | null;
  endereco: string | null;
  localizacao: string | null;
  observacoes: string | null;
};

export type Membro = {
  usuario_id: string;
  nome: string;
  email: string;
  perfil: string;
  membro_desde: string;
};

export type ConvitePendente = {
  id: string;
  email: string;
  perfil: string;
  criado_em: string;
  tem_conta: boolean;
};

export default async function LocalPage({
  params,
}: {
  params: Promise<{ localId: string }>;
}) {
  const { localId } = await params;
  const localAtual = await buscarLocalAtual(localId);
  const gerente = ehGerente(localAtual.perfil);

  const supabase = await criarClienteServidor();
  const { data: local } = await supabase
    .from("locais")
    .select("id, nome, codigo, tamanho, endereco, localizacao, observacoes")
    .eq("id", localId)
    .single();

  if (!local) notFound();

  let membros: Membro[] = [];
  let convites: ConvitePendente[] = [];
  if (gerente) {
    const [{ data: dadosMembros }, { data: dadosConvites }] = await Promise.all([
      supabase.rpc("listar_membros_local", { p_local_id: localId }),
      supabase.rpc("listar_convites_pendentes_local", { p_local_id: localId }),
    ]);
    membros = dadosMembros ?? [];
    convites = dadosConvites ?? [];
  }

  return (
    <div className="flex flex-col gap-8">
      <FormularioLocal local={local} podeEditar={gerente} />

      {gerente && (
        <Membros localId={localId} membros={membros} convites={convites} />
      )}

      <SairOuApagarLocal localId={localId} nome={local.nome} gerente={gerente} />
    </div>
  );
}
