import { buscarLocalAtual, podeGerenciarConteudo } from "@/lib/local";
import { criarClienteServidor } from "@/lib/supabase/server";
import { ListaCategorias } from "./lista-categorias";

export type Especie = "bovino" | "ovino" | "equino";

export type Categoria = {
  id: string;
  descricao: string;
  especie: Especie;
  sexo: string;
  categoria_ivz_id: string;
  grupo: string | null;
  grupo_id: string | null;
  observacao: string | null;
  ordem: number;
  ativo: boolean;
};

export type GrupoCategoria = { id: string; nome: string; especie: Especie };

export type CategoriaIvz = {
  id: string;
  nome: string;
  especie: Especie;
  sexo: string;
};

export type CategoriaSugerida = {
  id: string;
  descricao: string;
  especie: Especie;
  sexo: string;
  ordem: number;
  categoria_ivz_id: string;
};

export default async function CategoriasPage({
  params,
}: {
  params: Promise<{ localId: string }>;
}) {
  const { localId } = await params;
  const local = await buscarLocalAtual(localId);

  const supabase = await criarClienteServidor();
  const [{ data: categorias }, { data: categoriasIvz }, { data: categoriasSugeridas }, { data: grupos }] = await Promise.all([
    supabase
      .from("categorias")
      .select("id, descricao, especie, sexo, categoria_ivz_id, grupo, grupo_id, observacao, ordem, ativo")
      .eq("local_id", localId)
      .order("ordem")
      .order("descricao"),
    supabase.from("categorias_ivz").select("id, nome, especie, sexo").eq("ativo", true).order("ordem"),
    supabase
      .from("categorias_sugeridas")
      .select("id, descricao, especie, sexo, ordem, categoria_ivz_id")
      .eq("ativo", true)
      .order("ordem"),
    supabase.from("grupos_categoria").select("id, nome, especie").eq("local_id", localId).order("ordem").order("nome"),
  ]);

  return (
    <div className="flex flex-1 flex-col gap-4">
      <div>
        <h1 className="text-xl font-semibold">Categorias</h1>
        <p className="text-sm text-muted-foreground">
          Categorias de manejo do rebanho, por espécie — todo animal fica em uma delas.
        </p>
      </div>
      <ListaCategorias
        localId={localId}
        categorias={(categorias as Categoria[]) ?? []}
        categoriasIvz={(categoriasIvz as CategoriaIvz[]) ?? []}
        categoriasSugeridas={(categoriasSugeridas as CategoriaSugerida[]) ?? []}
        grupos={(grupos as GrupoCategoria[]) ?? []}
        podeEditar={podeGerenciarConteudo(local.perfil)}
      />
    </div>
  );
}
