import Link from "next/link";
import { buscarLocalAtual, podeGerenciarConteudo } from "@/lib/local";
import { criarClienteServidor } from "@/lib/supabase/server";
import { carregarDadosPainelAreas } from "@/lib/painel-areas";
import { buscarDiario } from "@/lib/actions/diario";
import { Card, CardHeader, CardTitle, CardAction, CardContent } from "@/components/ui/card";
import { PainelAreas } from "./areas/painel/painel-areas";
import { DiarioFazenda } from "./diario-fazenda";
import { TabelaAnimaisInicio, type AnimalInicio } from "./tabela-animais-inicio";

function primeiro<T>(valor: T | T[] | null): T | null {
  return Array.isArray(valor) ? (valor[0] ?? null) : valor;
}

type ClienteServidor = Awaited<ReturnType<typeof criarClienteServidor>>;

// Mesma paginação da tela de Animais: a API tem teto de linhas por resposta.
async function buscarAnimaisInicio(supabase: ClienteServidor, localId: string): Promise<AnimalInicio[]> {
  const TAMANHO_PAGINA = 1000;
  const todos: Record<string, unknown>[] = [];
  let pagina = 0;

  while (true) {
    const { data, error } = await supabase
      .from("animais")
      .select("id, nome, brinco, tatuagem, especie, sexo, areas(nome), categorias!categoria_id(descricao)")
      .eq("local_id", localId)
      .eq("origem_registro", "proprio")
      .eq("situacao", "ativo")
      .order("criado_em", { ascending: false })
      .range(pagina * TAMANHO_PAGINA, pagina * TAMANHO_PAGINA + TAMANHO_PAGINA - 1);

    if (error) throw new Error("Não foi possível carregar os animais: " + error.message);
    todos.push(...(data ?? []));
    if (!data || data.length < TAMANHO_PAGINA) break;
    pagina++;
  }

  return todos.map((a) => ({
    id: a.id as string,
    nome: a.nome as string | null,
    brinco: a.brinco as string | null,
    tatuagem: a.tatuagem as string | null,
    especie: a.especie as AnimalInicio["especie"],
    sexo: a.sexo as string,
    area_nome: primeiro(a.areas as { nome: string } | { nome: string }[] | null)?.nome ?? "—",
    categoria_descricao:
      primeiro(a.categorias as { descricao: string } | { descricao: string }[] | null)?.descricao ?? "—",
  }));
}

export default async function InicioLocalPage({
  params,
}: {
  params: Promise<{ localId: string }>;
}) {
  const { localId } = await params;
  const local = await buscarLocalAtual(localId);

  const supabase = await criarClienteServidor();
  const [animais, dadosAreas, diario] = await Promise.all([
    buscarAnimaisInicio(supabase, localId),
    carregarDadosPainelAreas(supabase, localId),
    buscarDiario(localId, 30),
  ]);

  // Em telas grandes cada coluna tem a altura da janela e rola por dentro;
  // em telas pequenas os cards empilham e a página rola normalmente.
  const alturaColuna = "lg:h-[calc(100vh-3rem)]";

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
      <Card className={alturaColuna}>
        <CardHeader>
          <CardTitle className="text-base">Animais</CardTitle>
          <CardAction>
            <Link href={`/${localId}/animais`} className="text-sm text-muted-foreground hover:underline">
              Abrir tela completa
            </Link>
          </CardAction>
        </CardHeader>
        <CardContent className="flex min-h-0 flex-1 flex-col">
          <TabelaAnimaisInicio localId={localId} animais={animais} />
        </CardContent>
      </Card>

      <Card className={alturaColuna}>
        <CardHeader>
          <CardTitle className="text-base">Áreas</CardTitle>
          <CardAction>
            <Link href={`/${localId}/areas`} className="text-sm text-muted-foreground hover:underline">
              Gerenciar áreas
            </Link>
          </CardAction>
        </CardHeader>
        <CardContent className="min-h-0 flex-1 overflow-y-auto">
          <PainelAreas
            localId={localId}
            {...dadosAreas}
            podeEditar={podeGerenciarConteudo(local.perfil)}
            compacto
          />
        </CardContent>
      </Card>

      <Card className={alturaColuna}>
        <CardHeader>
          <CardTitle className="text-base">Diário da fazenda</CardTitle>
        </CardHeader>
        <CardContent className="min-h-0 flex-1 overflow-y-auto">
          <DiarioFazenda
            localId={localId}
            eventosIniciais={"eventos" in diario ? diario.eventos : []}
            erroInicial={"error" in diario ? diario.error : null}
          />
        </CardContent>
      </Card>
    </div>
  );
}
