"use client";

import { Fragment, useMemo, useState } from "react";
import { Undo2, Tags, ArrowUp, ArrowDown, ArrowUpDown, ChevronDown, ChevronRight } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import { FiltroMultiSelecao } from "@/components/filtro-multi-selecao";
import { TabelaResumo, contar } from "@/components/tabela-resumo";
import { identificacaoAnimal } from "@/components/card-selecao-animais";
import { cn } from "@/lib/utils";
import { desfazerUltimaTrocaCategoria } from "@/lib/actions/trocas";
import type { CicloAtivo, GrupoTroca } from "./page";

const rotulosEspecie: Record<string, string> = { bovino: "Bovinos", ovino: "Ovinos", equino: "Equinos" };

function formatarData(data: string) {
  return new Date(data + "T00:00:00").toLocaleDateString("pt-BR");
}

// Um grupo pode juntar animais de categorias diferentes (na origem e, desde
// o painel novo, também no destino).
function categoriaUnica(valores: (string | null)[]) {
  const distintos = Array.from(new Set(valores.filter((v): v is string => !!v)));
  if (distintos.length === 0) return "—";
  if (distintos.length === 1) return distintos[0];
  return "Várias categorias";
}

type ColunaId = "data" | "descricao" | "quantidade" | "origem" | "destino" | "responsavel";

const colunas: { id: ColunaId; rotulo: string; alinhamento?: "right" }[] = [
  { id: "data", rotulo: "Data" },
  { id: "descricao", rotulo: "Descrição" },
  { id: "quantidade", rotulo: "Animais", alinhamento: "right" },
  { id: "origem", rotulo: "Origem" },
  { id: "destino", rotulo: "Destino" },
  { id: "responsavel", rotulo: "Responsável" },
];

function valorOrdenacao(g: GrupoTroca, coluna: ColunaId): string | number {
  switch (coluna) {
    case "data":
      return g.data;
    case "descricao":
      return (g.descricao ?? "").toLowerCase();
    case "quantidade":
      return g.animais.length;
    case "origem":
      return categoriaUnica(g.animais.map((a) => a.categoria_origem_descricao)).toLowerCase();
    case "destino":
      return categoriaUnica(g.animais.map((a) => a.categoria_destino_descricao)).toLowerCase();
    case "responsavel":
      return (g.responsavel ?? "").toLowerCase();
  }
}

type Periodo = "ciclo" | "12meses" | "todos";

type Props = {
  localId: string;
  grupos: GrupoTroca[];
  ciclo: CicloAtivo;
  podeEditar: boolean;
};

export function HistoricoTrocas({ localId, grupos, ciclo, podeEditar }: Props) {
  const [periodo, setPeriodo] = useState<Periodo>(ciclo ? "ciclo" : "12meses");
  const [especiesFiltro, setEspeciesFiltro] = useState<Set<string>>(new Set());
  const [areasFiltro, setAreasFiltro] = useState<Set<string>>(new Set());
  const [ordenacao, setOrdenacao] = useState<{ coluna: ColunaId; desc: boolean }>({ coluna: "data", desc: true });
  const [abertos, setAbertos] = useState<Set<string>>(new Set());
  const [desfazendo, setDesfazendo] = useState(false);

  const grupoMaisRecenteId = useMemo(() => {
    if (grupos.length === 0) return null;
    return grupos.reduce((mais, atual) => (atual.criado_em > mais.criado_em ? atual : mais)).troca_grupo_id;
  }, [grupos]);

  const areasDisponiveis = useMemo(
    () =>
      Array.from(new Set(grupos.flatMap((g) => g.animais.map((a) => a.area_nome ?? "Sem área")))).sort((a, b) =>
        a.localeCompare(b, "pt-BR"),
      ),
    [grupos],
  );

  function ordenarPor(coluna: ColunaId) {
    setOrdenacao((atual) => (atual.coluna === coluna ? { coluna, desc: !atual.desc } : { coluna, desc: false }));
  }

  function alternar(id: string) {
    setAbertos((atual) => {
      const novo = new Set(atual);
      if (novo.has(id)) novo.delete(id);
      else novo.add(id);
      return novo;
    });
  }

  const dados = useMemo(() => {
    const hoje = new Date().toISOString().slice(0, 10);
    const umAnoAtras = new Date();
    umAnoAtras.setFullYear(umAnoAtras.getFullYear() - 1);
    const inicio =
      periodo === "ciclo" && ciclo
        ? ciclo.data_inicio
        : periodo === "12meses"
          ? umAnoAtras.toISOString().slice(0, 10)
          : null;
    const fim = periodo === "ciclo" && ciclo ? (ciclo.data_fim ?? hoje) : null;

    // Espécie e área filtram animal por animal (a área é a atual do animal);
    // o grupo aparece com só os animais que passaram.
    const filtrados: GrupoTroca[] = [];
    for (const g of grupos) {
      if (inicio && g.data < inicio) continue;
      if (fim && g.data > fim) continue;
      const animais = g.animais.filter(
        (a) =>
          (especiesFiltro.size === 0 || (a.especie && especiesFiltro.has(a.especie))) &&
          (areasFiltro.size === 0 || areasFiltro.has(a.area_nome ?? "Sem área")),
      );
      if (animais.length > 0) filtrados.push(animais.length === g.animais.length ? g : { ...g, animais });
    }

    return filtrados.sort((a, b) => {
      const va = valorOrdenacao(a, ordenacao.coluna);
      const vb = valorOrdenacao(b, ordenacao.coluna);
      const cmp =
        typeof va === "number" && typeof vb === "number" ? va - vb : String(va).localeCompare(String(vb), "pt-BR");
      return ordenacao.desc ? -cmp : cmp;
    });
  }, [grupos, periodo, ciclo, especiesFiltro, areasFiltro, ordenacao]);

  // Resumos no mesmo recorte da tabela, contando animal por animal.
  const resumo = useMemo(() => {
    const animais = dados.flatMap((g) => g.animais);
    return {
      trocas: dados.length,
      animais: animais.length,
      origem: contar(animais.map((a) => a.categoria_origem_descricao ?? "Sem categoria")),
      destino: contar(animais.map((a) => a.categoria_destino_descricao ?? "Sem categoria")),
      caminhos: contar(
        animais.map((a) => `${a.categoria_origem_descricao ?? "—"} → ${a.categoria_destino_descricao ?? "—"}`),
      ),
    };
  }, [dados]);

  async function desfazer() {
    if (!confirm("Desfazer a última troca de categoria? Isso registra uma nova troca de volta pra categoria anterior.")) return;
    setDesfazendo(true);
    try {
      const resultado = await desfazerUltimaTrocaCategoria(localId);
      if (resultado.error) alert(resultado.error);
    } catch (e) {
      alert(e instanceof Error ? e.message : "Não foi possível desfazer.");
    } finally {
      setDesfazendo(false);
    }
  }

  const periodos: { id: Periodo; rotulo: string }[] = [
    ...(ciclo ? [{ id: "ciclo" as const, rotulo: `Ciclo ${ciclo.nome}` }] : []),
    { id: "12meses", rotulo: "Últimos 12 meses" },
    { id: "todos", rotulo: "Todos" },
  ];

  return (
    <div className="flex flex-col gap-3">
      <div>
        <h1 className="text-xl font-semibold">Trocas de Categoria</h1>
        <p className="text-sm text-muted-foreground">Mudanças de categoria do rebanho.</p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="flex flex-wrap items-center gap-1">
          {periodos.map((p) => (
            <button
              key={p.id}
              onClick={() => setPeriodo(p.id)}
              className={cn(buttonVariants({ variant: periodo === p.id ? "secondary" : "ghost", size: "sm" }))}
            >
              {p.rotulo}
            </button>
          ))}
        </div>
        <FiltroMultiSelecao
          rotulo="Todas as espécies"
          className="w-full md:w-auto"
          selecionados={especiesFiltro}
          onChange={setEspeciesFiltro}
          opcoes={Object.entries(rotulosEspecie).map(([value, label]) => ({ value, label }))}
        />
        <FiltroMultiSelecao
          rotulo="Todas as áreas"
          className="w-full md:w-auto"
          selecionados={areasFiltro}
          onChange={setAreasFiltro}
          opcoes={areasDisponiveis.map((a) => ({ value: a, label: a }))}
        />
        <span className="text-xs text-muted-foreground">Área = onde o animal está hoje.</span>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {[
          { rotulo: "Trocas", valor: resumo.trocas },
          { rotulo: "Animais trocados", valor: resumo.animais },
        ].map((r) => (
          <div key={r.rotulo} className="rounded-lg border p-3">
            <div className="text-xs text-muted-foreground">{r.rotulo}</div>
            <div className="text-lg font-semibold tabular-nums">{r.valor}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <TabelaResumo titulo="Saíram da categoria (origem)" linhas={resumo.origem} />
        <TabelaResumo titulo="Entraram na categoria (destino)" linhas={resumo.destino} />
        <TabelaResumo titulo="Origem → destino" linhas={resumo.caminhos} />
      </div>

      {dados.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed py-12 text-muted-foreground">
          <Tags className="size-8" />
          <p>Nenhuma troca de categoria no período.</p>
        </div>
      ) : (
        <div className="max-h-[32rem] overflow-auto rounded-lg border">
          <Table>
            <TableHeader className="sticky top-0 z-10 bg-card">
              <TableRow>
                {colunas.map((coluna) => (
                  <TableHead key={coluna.id} className={coluna.alinhamento === "right" ? "text-right" : undefined}>
                    <button
                      type="button"
                      onClick={() => ordenarPor(coluna.id)}
                      className={`inline-flex items-center gap-1 hover:text-foreground ${
                        coluna.alinhamento === "right" ? "flex-row-reverse" : ""
                      }`}
                    >
                      {coluna.rotulo}
                      {ordenacao.coluna === coluna.id ? (
                        ordenacao.desc ? (
                          <ArrowDown className="size-3.5" />
                        ) : (
                          <ArrowUp className="size-3.5" />
                        )
                      ) : (
                        <ArrowUpDown className="size-3.5 text-muted-foreground/50" />
                      )}
                    </button>
                  </TableHead>
                ))}
                {podeEditar && <TableHead className="w-28" />}
              </TableRow>
            </TableHeader>
            <TableBody>
              {dados.map((g) => {
                const aberto = abertos.has(g.troca_grupo_id);
                return (
                  <Fragment key={g.troca_grupo_id}>
                    <TableRow className="cursor-pointer" onClick={() => alternar(g.troca_grupo_id)}>
                      <TableCell className="font-medium">
                        <span className="inline-flex items-center gap-1">
                          {aberto ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
                          {formatarData(g.data)}
                        </span>
                      </TableCell>
                      <TableCell>{g.descricao ?? "—"}</TableCell>
                      <TableCell className="text-right tabular-nums">{g.animais.length}</TableCell>
                      <TableCell>{categoriaUnica(g.animais.map((a) => a.categoria_origem_descricao))}</TableCell>
                      <TableCell>{categoriaUnica(g.animais.map((a) => a.categoria_destino_descricao))}</TableCell>
                      <TableCell>{g.responsavel ?? "—"}</TableCell>
                      {podeEditar && (
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          {g.troca_grupo_id === grupoMaisRecenteId && (
                            <Button variant="ghost" size="sm" disabled={desfazendo} onClick={desfazer}>
                              <Undo2 className="size-4" />
                              Desfazer
                            </Button>
                          )}
                        </TableCell>
                      )}
                    </TableRow>
                    {aberto && (
                      <TableRow className="hover:bg-transparent">
                        <TableCell colSpan={colunas.length + (podeEditar ? 1 : 0)} className="bg-muted/30">
                          <div className="flex flex-col gap-0.5 pl-5 text-sm text-muted-foreground">
                            {g.animais.map((a) => (
                              <span key={a.animal_id}>
                                {identificacaoAnimal(a)}: {a.categoria_origem_descricao ?? "—"} →{" "}
                                {a.categoria_destino_descricao ?? "—"}
                              </span>
                            ))}
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </Fragment>
                );
              })}
            </TableBody>
            <TableFooter>
              <TableRow>
                <TableCell className="text-sm font-normal text-muted-foreground">
                  {dados.length} {dados.length === 1 ? "troca" : "trocas"}
                </TableCell>
                <TableCell className="text-right font-medium">Total</TableCell>
                <TableCell className="text-right font-medium tabular-nums">{resumo.animais}</TableCell>
                <TableCell colSpan={3} />
                {podeEditar && <TableCell />}
              </TableRow>
            </TableFooter>
          </Table>
        </div>
      )}
    </div>
  );
}
