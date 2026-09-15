import { buscarLocalAtual, podeGerenciarConteudo } from "@/lib/local";
import { criarClienteServidor } from "@/lib/supabase/server";
import { TabelaAnimaisManejo } from "./tabela-animais-manejo";
import { HistoricoManejos } from "./historico-manejos";

export type Especie = "bovino" | "ovino" | "equino";

export type AnimalManejo = {
  id: string;
  nome: string | null;
  brinco: string | null;
  tatuagem: string | null;
  especie: Especie;
  sexo: string;
  grau_sangue: string;
  area_id: string;
  area_nome: string;
  categoria_descricao: string;
  raca_descricao: string;
};

export type OpcaoArea = { id: string; nome: string };
export type OpcaoMedicamento = {
  id: string;
  descricao: string;
  marca: string | null;
  principio_ativo: string | null;
  dosagem: string | null;
};

export type ManejoAnimal = {
  id: string;
  nome: string | null;
  brinco: string | null;
  tatuagem: string | null;
};

export type GrupoManejo = {
  id: string;
  data: string;
  especie: Especie;
  area_nome: string | null;
  area_id: string;
  responsavel: string | null;
  descricao: string | null;
  observacoes: string | null;
  criado_em: string;
  animais: ManejoAnimal[];
  medicamentos: string[];
  medicamentoIds: string[];
};

function primeiro<T>(valor: T | T[] | null): T | null {
  return Array.isArray(valor) ? (valor[0] ?? null) : valor;
}

type ClienteServidor = Awaited<ReturnType<typeof criarClienteServidor>>;

async function buscarAnimaisAtivos(supabase: ClienteServidor, localId: string) {
  const TAMANHO_PAGINA = 1000;
  const todos: Record<string, unknown>[] = [];
  let pagina = 0;

  while (true) {
    const { data, error } = await supabase
      .from("animais")
      .select(
        `id, nome, brinco, tatuagem, especie, sexo, grau_sangue, area_id,
         areas(nome), categorias!categoria_id(descricao), racas(descricao)`,
      )
      .eq("local_id", localId)
      .eq("origem_registro", "proprio")
      .eq("situacao", "ativo")
      .order("criado_em", { ascending: false })
      .range(pagina * TAMANHO_PAGINA, pagina * TAMANHO_PAGINA + TAMANHO_PAGINA - 1);

    if (error) throw new Error(error.message);
    todos.push(...(data ?? []));
    if (!data || data.length < TAMANHO_PAGINA) break;
    pagina++;
  }

  return todos;
}

export default async function ManejosSanitariosPage({
  params,
}: {
  params: Promise<{ localId: string }>;
}) {
  const { localId } = await params;
  const local = await buscarLocalAtual(localId);
  const podeEditar = podeGerenciarConteudo(local.perfil);

  const supabase = await criarClienteServidor();
  const [
    animaisAtivosRaw,
    { data: areas, error: erroAreas },
    { data: medicamentos, error: erroMedicamentos },
    { data: manejosRaw, error: erroManejos },
    { data: manejosAnimaisRaw, error: erroManejosAnimais },
    { data: manejosMedicamentosRaw, error: erroManejosMedicamentos },
  ] = await Promise.all([
    buscarAnimaisAtivos(supabase, localId),
    supabase.from("areas").select("id, nome").eq("local_id", localId).eq("ativo", true).order("ordem"),
    supabase
      .from("medicamentos")
      .select("id, descricao, marca, principio_ativo, dosagem")
      .eq("local_id", localId)
      .eq("ativo", true)
      .order("descricao"),
    supabase
      .from("manejos_sanitarios")
      .select("id, area_id, areas(nome), data, especie, responsavel, observacoes, descricao, criado_em")
      .eq("local_id", localId)
      .order("criado_em", { ascending: false }),
    supabase.from("manejos_sanitarios_animais").select("manejo_id, animal_id, animais(nome, brinco, tatuagem)").eq("local_id", localId),
    supabase
      .from("manejos_sanitarios_medicamentos")
      .select("manejo_id, medicamento_id, medicamentos(descricao)")
      .eq("local_id", localId),
  ]);

  if (erroAreas || erroMedicamentos || erroManejos || erroManejosAnimais || erroManejosMedicamentos) {
    throw new Error(
      "Não foi possível carregar os manejos sanitários: " +
        (erroAreas?.message ||
          erroMedicamentos?.message ||
          erroManejos?.message ||
          erroManejosAnimais?.message ||
          erroManejosMedicamentos?.message),
    );
  }

  const animaisAtivos: AnimalManejo[] = animaisAtivosRaw.map((a) => ({
    ...a,
    area_nome: primeiro(a.areas as { nome: string } | { nome: string }[] | null)?.nome ?? "—",
    categoria_descricao:
      primeiro(a.categorias as { descricao: string } | { descricao: string }[] | null)?.descricao ?? "—",
    raca_descricao: primeiro(a.racas as { descricao: string } | { descricao: string }[] | null)?.descricao ?? "—",
  })) as unknown as AnimalManejo[];

  const animaisPorManejo = new Map<string, ManejoAnimal[]>();
  for (const linha of manejosAnimaisRaw ?? []) {
    const animal = primeiro(
      linha.animais as
        | { nome: string | null; brinco: string | null; tatuagem: string | null }
        | { nome: string | null; brinco: string | null; tatuagem: string | null }[]
        | null,
    );
    const lista = animaisPorManejo.get(linha.manejo_id) ?? [];
    lista.push({ id: linha.animal_id, nome: animal?.nome ?? null, brinco: animal?.brinco ?? null, tatuagem: animal?.tatuagem ?? null });
    animaisPorManejo.set(linha.manejo_id, lista);
  }

  const medicamentosPorManejo = new Map<string, { id: string; descricao: string }[]>();
  for (const linha of manejosMedicamentosRaw ?? []) {
    const medicamento = primeiro(linha.medicamentos as { descricao: string } | { descricao: string }[] | null);
    const lista = medicamentosPorManejo.get(linha.manejo_id) ?? [];
    lista.push({ id: linha.medicamento_id, descricao: medicamento?.descricao ?? "—" });
    medicamentosPorManejo.set(linha.manejo_id, lista);
  }

  const grupos: GrupoManejo[] = (manejosRaw ?? []).map((m) => {
    const medicamentosDoManejo = medicamentosPorManejo.get(m.id) ?? [];
    return {
      id: m.id,
      data: m.data,
      especie: m.especie,
      area_id: m.area_id,
      area_nome: primeiro(m.areas as { nome: string } | { nome: string }[] | null)?.nome ?? null,
      responsavel: m.responsavel,
      descricao: m.descricao,
      observacoes: m.observacoes,
      criado_em: m.criado_em,
      animais: animaisPorManejo.get(m.id) ?? [],
      medicamentos: medicamentosDoManejo.map((med) => med.descricao),
      medicamentoIds: medicamentosDoManejo.map((med) => med.id),
    };
  });

  return (
    <div className="flex flex-1 flex-col gap-6">
      <HistoricoManejos
        localId={localId}
        grupos={grupos}
        animais={animaisAtivos}
        areas={(areas as OpcaoArea[]) ?? []}
        medicamentos={(medicamentos as OpcaoMedicamento[]) ?? []}
        podeEditar={podeEditar}
      />
      <TabelaAnimaisManejo
        localId={localId}
        animais={animaisAtivos}
        areas={(areas as OpcaoArea[]) ?? []}
        medicamentos={(medicamentos as OpcaoMedicamento[]) ?? []}
        podeEditar={podeEditar}
      />
    </div>
  );
}
