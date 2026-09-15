"use client";

import { useMemo, useState } from "react";
import { Plus, Minus, Undo2, ClipboardList, ArrowUp, ArrowDown, ArrowUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import { desfazerUltimaEntradaAjuste, desfazerUltimaSaidaAjuste } from "@/lib/actions/ajustes";
import { DialogoEntradaAjuste } from "./dialogo-entrada-ajuste";
import { DialogoSaidaAjuste } from "./dialogo-saida-ajuste";
import type { AnimalAtivo, Especie, GrupoAjuste, OpcaoArea, OpcaoCategoria, OpcaoRaca, Tipo } from "./page";

const rotulosEspecie: Record<Especie, string> = { bovino: "Bovino", ovino: "Ovino", equino: "Equino" };
const rotulosTipo: Record<Tipo, string> = { entrada: "Entrada", saida: "Saída" };

function formatarData(data: string) {
  return new Date(data + "T00:00:00").toLocaleDateString("pt-BR");
}

type ColunaId = "tipo" | "data" | "descricao" | "quantidade" | "responsavel";

const colunas: { id: ColunaId; rotulo: string; alinhamento?: "right" }[] = [
  { id: "tipo", rotulo: "Tipo" },
  { id: "data", rotulo: "Data" },
  { id: "descricao", rotulo: "Descrição" },
  { id: "quantidade", rotulo: "Quantidade", alinhamento: "right" },
  { id: "responsavel", rotulo: "Responsável" },
];

function valorOrdenacao(g: GrupoAjuste, coluna: ColunaId): string | number {
  switch (coluna) {
    case "tipo":
      return rotulosTipo[g.tipo];
    case "data":
      return g.data;
    case "descricao":
      return (g.descricao ?? "").toLowerCase();
    case "quantidade":
      return g.animais.length;
    case "responsavel":
      return (g.responsavel ?? "").toLowerCase();
  }
}

type Props = {
  localId: string;
  grupos: GrupoAjuste[];
  animaisAtivos: AnimalAtivo[];
  areas: OpcaoArea[];
  categorias: OpcaoCategoria[];
  racas: OpcaoRaca[];
  podeEditar: boolean;
};

export function TabelaAjustes({ localId, grupos, animaisAtivos, areas, categorias, racas, podeEditar }: Props) {
  const [tiposFiltro, setTiposFiltro] = useState<Set<string>>(new Set());
  const [especiesFiltro, setEspeciesFiltro] = useState<Set<string>>(new Set());
  const [ordenacao, setOrdenacao] = useState<{ coluna: ColunaId; desc: boolean }>({ coluna: "data", desc: true });
  const [entradaAberta, setEntradaAberta] = useState(false);
  const [saidaAberta, setSaidaAberta] = useState(false);
  const [desfazendo, setDesfazendo] = useState<string | null>(null);

  const grupoMaisRecentePorTipo = useMemo(() => {
    const mapa: Partial<Record<Tipo, string>> = {};
    for (const tipo of ["entrada", "saida"] as Tipo[]) {
      const doTipo = grupos.filter((g) => g.tipo === tipo);
      if (doTipo.length === 0) continue;
      mapa[tipo] = doTipo.reduce((mais, atual) => (atual.criado_em > mais.criado_em ? atual : mais)).ocorrencia_grupo_id;
    }
    return mapa;
  }, [grupos]);

  function ordenarPor(coluna: ColunaId) {
    setOrdenacao((atual) => (atual.coluna === coluna ? { coluna, desc: !atual.desc } : { coluna, desc: false }));
  }

  const dados = useMemo(() => {
    const filtrados = grupos.filter((g) => {
      if (tiposFiltro.size > 0 && !tiposFiltro.has(g.tipo)) return false;
      if (especiesFiltro.size > 0 && !especiesFiltro.has(g.especie)) return false;
      return true;
    });

    return [...filtrados].sort((a, b) => {
      const va = valorOrdenacao(a, ordenacao.coluna);
      const vb = valorOrdenacao(b, ordenacao.coluna);
      const cmp =
        typeof va === "number" && typeof vb === "number" ? va - vb : String(va).localeCompare(String(vb), "pt-BR");
      return ordenacao.desc ? -cmp : cmp;
    });
  }, [grupos, tiposFiltro, especiesFiltro, ordenacao]);

  const totalAnimais = useMemo(() => dados.reduce((soma, g) => soma + g.animais.length, 0), [dados]);
  const indiceQuantidade = colunas.findIndex((c) => c.id === "quantidade");

  async function desfazer(grupo: GrupoAjuste) {
    const acaoLabel = grupo.tipo === "entrada" ? "entrada" : "saída";
    if (!confirm(`Desfazer esta ${acaoLabel} de acerto de contagem?`)) return;
    setDesfazendo(grupo.ocorrencia_grupo_id);
    try {
      if (grupo.tipo === "entrada") await desfazerUltimaEntradaAjuste(localId);
      else await desfazerUltimaSaidaAjuste(localId);
    } catch (e) {
      alert(e instanceof Error ? e.message : "Não foi possível desfazer.");
    } finally {
      setDesfazendo(null);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div>
        <h1 className="text-xl font-semibold">Acerto de contagem</h1>
        <p className="text-sm text-muted-foreground">
          Correção pontual quando a contagem física do rebanho não bate com o cadastrado — diferente de
          saldo inicial, morte, consumo ou furto.
        </p>
      </div>

      {podeEditar && (
        <div className="flex flex-wrap gap-2">
          <Button size="sm" onClick={() => setEntradaAberta(true)}>
            <Plus className="size-4" />
            Registrar entrada
          </Button>
          <Button size="sm" variant="outline" onClick={() => setSaidaAberta(true)}>
            <Minus className="size-4" />
            Registrar saída
          </Button>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <FiltroMultiSelecao
          rotulo="Todos os tipos"
          className="w-full md:w-auto"
          selecionados={tiposFiltro}
          onChange={setTiposFiltro}
          opcoes={Object.entries(rotulosTipo).map(([value, label]) => ({ value, label }))}
        />
        <FiltroMultiSelecao
          rotulo="Todas as espécies"
          className="w-full md:w-auto"
          selecionados={especiesFiltro}
          onChange={setEspeciesFiltro}
          opcoes={Object.entries(rotulosEspecie).map(([value, label]) => ({ value, label }))}
        />
        <span className="text-sm text-muted-foreground">{dados.length} registro(s)</span>
      </div>

      {dados.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed py-12 text-muted-foreground">
          <ClipboardList className="size-8" />
          <p>Nenhum acerto de contagem encontrado.</p>
        </div>
      ) : (
        <Table>
          <TableHeader>
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
            {dados.map((g) => (
              <TableRow
                key={g.ocorrencia_grupo_id}
                title={g.animais.length > 0 ? `Animais: ${g.animais.map((a) => a.brinco ?? a.nome ?? a.tatuagem ?? "—").join(", ")}` : undefined}
              >
                <TableCell>
                  <Badge variant={g.tipo === "entrada" ? "secondary" : "outline"}>{rotulosTipo[g.tipo]}</Badge>
                </TableCell>
                <TableCell className="font-medium">{formatarData(g.data)}</TableCell>
                <TableCell>{g.descricao ?? "—"}</TableCell>
                <TableCell className="text-right tabular-nums">{g.animais.length}</TableCell>
                <TableCell>{g.responsavel ?? "—"}</TableCell>
                {podeEditar && (
                  <TableCell>
                    {grupoMaisRecentePorTipo[g.tipo] === g.ocorrencia_grupo_id && (
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={desfazendo === g.ocorrencia_grupo_id}
                        onClick={() => desfazer(g)}
                      >
                        <Undo2 className="size-4" />
                        Desfazer
                      </Button>
                    )}
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
          <TableFooter>
            <TableRow>
              <TableCell colSpan={2} className="text-sm font-normal text-muted-foreground">
                {dados.length} {dados.length === 1 ? "registro" : "registros"}
              </TableCell>
              <TableCell colSpan={indiceQuantidade - 2} className="text-right font-medium">
                Total de animais
              </TableCell>
              <TableCell className="text-right font-medium tabular-nums">{totalAnimais}</TableCell>
              <TableCell colSpan={colunas.length - indiceQuantidade - 1} />
              {podeEditar && <TableCell />}
            </TableRow>
          </TableFooter>
        </Table>
      )}

      {podeEditar && (
        <DialogoEntradaAjuste
          key={entradaAberta ? "aberta" : "fechada"}
          localId={localId}
          aberto={entradaAberta}
          areas={areas}
          categorias={categorias}
          racas={racas}
          onFechar={() => setEntradaAberta(false)}
        />
      )}

      {podeEditar && (
        <DialogoSaidaAjuste
          key={saidaAberta ? "aberta" : "fechada"}
          localId={localId}
          aberto={saidaAberta}
          animaisAtivos={animaisAtivos}
          onFechar={() => setSaidaAberta(false)}
        />
      )}
    </div>
  );
}
