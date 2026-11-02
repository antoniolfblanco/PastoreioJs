"use client";

import { Fragment, useMemo, useState } from "react";
import { Pencil, Trash2, Stethoscope, ArrowUp, ArrowDown, ArrowUpDown, ChevronDown, ChevronRight } from "lucide-react";
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
import { apagarManejoSanitario } from "@/lib/actions/manejos-sanitarios";
import { DialogoEditarManejo } from "./dialogo-editar-manejo";
import type { AnimalManejo, CicloAtivo, GrupoManejo, OpcaoArea, OpcaoMedicamento } from "./page";

const rotulosEspecie: Record<string, string> = { bovino: "Bovinos", ovino: "Ovinos", equino: "Equinos" };

function formatarData(data: string) {
  return new Date(data + "T00:00:00").toLocaleDateString("pt-BR");
}

type ColunaId = "data" | "descricao" | "quantidade" | "area" | "medicamentos" | "responsavel";

const colunas: { id: ColunaId; rotulo: string; alinhamento?: "right" }[] = [
  { id: "data", rotulo: "Data" },
  { id: "descricao", rotulo: "Descrição" },
  { id: "quantidade", rotulo: "Animais", alinhamento: "right" },
  { id: "area", rotulo: "Área" },
  { id: "medicamentos", rotulo: "Medicamentos" },
  { id: "responsavel", rotulo: "Responsável" },
];

function valorOrdenacao(g: GrupoManejo, coluna: ColunaId): string | number {
  switch (coluna) {
    case "data":
      return g.data;
    case "descricao":
      return (g.descricao ?? "").toLowerCase();
    case "quantidade":
      return g.animais.length;
    case "area":
      return (g.area_nome ?? "").toLowerCase();
    case "medicamentos":
      return g.medicamentos.join(", ").toLowerCase();
    case "responsavel":
      return (g.responsavel ?? "").toLowerCase();
  }
}

type Periodo = "ciclo" | "12meses" | "todos";

type Props = {
  localId: string;
  grupos: GrupoManejo[];
  animais: AnimalManejo[];
  areas: OpcaoArea[];
  medicamentos: OpcaoMedicamento[];
  ciclo: CicloAtivo;
  podeEditar: boolean;
};

export function HistoricoManejos({ localId, grupos, animais, areas, medicamentos, ciclo, podeEditar }: Props) {
  const [periodo, setPeriodo] = useState<Periodo>(ciclo ? "ciclo" : "12meses");
  const [especiesFiltro, setEspeciesFiltro] = useState<Set<string>>(new Set());
  const [areasFiltro, setAreasFiltro] = useState<Set<string>>(new Set());
  const [ordenacao, setOrdenacao] = useState<{ coluna: ColunaId; desc: boolean }>({ coluna: "data", desc: true });
  const [abertos, setAbertos] = useState<Set<string>>(new Set());
  const [apagando, setApagando] = useState<string | null>(null);
  const [editando, setEditando] = useState<GrupoManejo | null>(null);

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

    const filtrados = grupos.filter((g) => {
      if (especiesFiltro.size > 0 && !especiesFiltro.has(g.especie)) return false;
      if (areasFiltro.size > 0 && !areasFiltro.has(g.area_id)) return false;
      if (inicio && g.data < inicio) return false;
      if (fim && g.data > fim) return false;
      return true;
    });

    return [...filtrados].sort((a, b) => {
      const va = valorOrdenacao(a, ordenacao.coluna);
      const vb = valorOrdenacao(b, ordenacao.coluna);
      const cmp =
        typeof va === "number" && typeof vb === "number" ? va - vb : String(va).localeCompare(String(vb), "pt-BR");
      return ordenacao.desc ? -cmp : cmp;
    });
  }, [grupos, periodo, ciclo, especiesFiltro, areasFiltro, ordenacao]);

  // Resumos no mesmo recorte da tabela, contando animal por animal.
  const resumo = useMemo(() => {
    const animaisTratados = new Set(dados.flatMap((g) => g.animais.map((a) => a.id)));
    return {
      manejos: dados.length,
      aplicacoes: dados.reduce((soma, g) => soma + g.animais.length, 0),
      animaisTratados: animaisTratados.size,
      porMedicamento: contar(
        dados.flatMap((g) =>
          (g.medicamentos.length > 0 ? g.medicamentos : ["Sem medicamento"]).flatMap((m) => g.animais.map(() => m)),
        ),
      ),
      porArea: contar(dados.flatMap((g) => g.animais.map(() => g.area_nome ?? "Sem área"))),
    };
  }, [dados]);

  async function apagar(grupo: GrupoManejo) {
    if (!confirm("Apagar este manejo sanitário? Essa ação não pode ser desfeita.")) return;
    setApagando(grupo.id);
    try {
      const resultado = await apagarManejoSanitario(localId, grupo.id);
      if (resultado.error) alert(resultado.error);
    } catch (e) {
      alert(e instanceof Error ? e.message : "Não foi possível apagar.");
    } finally {
      setApagando(null);
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
        <h1 className="text-xl font-semibold">Manejos Sanitários</h1>
        <p className="text-sm text-muted-foreground">Vacinas, vermífugos e tratamentos aplicados no rebanho.</p>
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
          opcoes={areas.map((a) => ({ value: a.id, label: a.nome }))}
        />
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        {[
          { rotulo: "Manejos", valor: resumo.manejos },
          { rotulo: "Aplicações (animal × manejo)", valor: resumo.aplicacoes },
          { rotulo: "Animais diferentes tratados", valor: resumo.animaisTratados },
        ].map((r) => (
          <div key={r.rotulo} className="rounded-lg border p-3">
            <div className="text-xs text-muted-foreground">{r.rotulo}</div>
            <div className="text-lg font-semibold tabular-nums">{r.valor}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <TabelaResumo titulo="Animais por medicamento" linhas={resumo.porMedicamento} />
        <TabelaResumo titulo="Animais por área" linhas={resumo.porArea} />
      </div>

      {dados.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed py-12 text-muted-foreground">
          <Stethoscope className="size-8" />
          <p>Nenhum manejo sanitário no período.</p>
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
                {podeEditar && <TableHead className="w-40" />}
              </TableRow>
            </TableHeader>
            <TableBody>
              {dados.map((g) => {
                const aberto = abertos.has(g.id);
                return (
                  <Fragment key={g.id}>
                    <TableRow className="cursor-pointer" onClick={() => alternar(g.id)}>
                      <TableCell className="font-medium">
                        <span className="inline-flex items-center gap-1">
                          {aberto ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
                          {formatarData(g.data)}
                        </span>
                      </TableCell>
                      <TableCell>{g.descricao ?? "—"}</TableCell>
                      <TableCell className="text-right tabular-nums">{g.animais.length}</TableCell>
                      <TableCell>{g.area_nome ?? "—"}</TableCell>
                      <TableCell>{g.medicamentos.length > 0 ? g.medicamentos.join(", ") : "—"}</TableCell>
                      <TableCell>{g.responsavel ?? "—"}</TableCell>
                      {podeEditar && (
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center gap-1">
                            <Button variant="ghost" size="sm" onClick={() => setEditando(g)}>
                              <Pencil className="size-4" />
                              Editar
                            </Button>
                            <Button variant="ghost" size="sm" disabled={apagando === g.id} onClick={() => apagar(g)}>
                              <Trash2 className="size-4" />
                              Apagar
                            </Button>
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                    {aberto && (
                      <TableRow className="hover:bg-transparent">
                        <TableCell colSpan={colunas.length + (podeEditar ? 1 : 0)} className="bg-muted/30">
                          <div className="flex flex-col gap-1 pl-5 text-sm text-muted-foreground">
                            <span>{g.animais.map((a) => identificacaoAnimal(a)).join(", ") || "Sem animais"}</span>
                            {g.observacoes && <span className="italic">{g.observacoes}</span>}
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
                  {dados.length} {dados.length === 1 ? "manejo" : "manejos"}
                </TableCell>
                <TableCell className="text-right font-medium">Total</TableCell>
                <TableCell className="text-right font-medium tabular-nums">{resumo.aplicacoes}</TableCell>
                <TableCell colSpan={3} />
                {podeEditar && <TableCell />}
              </TableRow>
            </TableFooter>
          </Table>
        </div>
      )}

      {podeEditar && (
        <DialogoEditarManejo
          localId={localId}
          grupo={editando}
          animais={animais}
          areas={areas}
          medicamentos={medicamentos}
          onFechar={() => setEditando(null)}
        />
      )}
    </div>
  );
}
