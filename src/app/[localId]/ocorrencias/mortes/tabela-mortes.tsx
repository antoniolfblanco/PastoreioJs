"use client";

import { useMemo, useState } from "react";
import { Plus, Undo2, Skull, ArrowUp, ArrowDown, ArrowUpDown } from "lucide-react";
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
import { desfazerUltimaMorte } from "@/lib/actions/mortes";
import { DialogoMorte } from "./dialogo-morte";
import type { AnimalAtivo, Especie, GrupoMorte, OpcaoEnfermidade } from "./page";

const rotulosEspecie: Record<Especie, string> = { bovino: "Bovino", ovino: "Ovino", equino: "Equino" };

function formatarData(data: string) {
  return new Date(data + "T00:00:00").toLocaleDateString("pt-BR");
}

type ColunaId = "data" | "descricao" | "quantidade" | "causa" | "tratada";

const colunas: { id: ColunaId; rotulo: string; alinhamento?: "right" }[] = [
  { id: "data", rotulo: "Data" },
  { id: "descricao", rotulo: "Descrição" },
  { id: "quantidade", rotulo: "Quantidade", alinhamento: "right" },
  { id: "causa", rotulo: "Causa" },
  { id: "tratada", rotulo: "Tratada" },
];

function valorOrdenacao(g: GrupoMorte, coluna: ColunaId): string | number {
  switch (coluna) {
    case "data":
      return g.data;
    case "descricao":
      return (g.descricao ?? "").toLowerCase();
    case "quantidade":
      return g.animais.length;
    case "causa":
      return (g.enfermidade_descricao ?? "").toLowerCase();
    case "tratada":
      return g.tratada ? 0 : 1;
  }
}

type Props = {
  localId: string;
  grupos: GrupoMorte[];
  animaisAtivos: AnimalAtivo[];
  enfermidades: OpcaoEnfermidade[];
  podeEditar: boolean;
};

export function TabelaMortes({ localId, grupos, animaisAtivos, enfermidades, podeEditar }: Props) {
  const [especiesFiltro, setEspeciesFiltro] = useState<Set<string>>(new Set());
  const [causasFiltro, setCausasFiltro] = useState<Set<string>>(new Set());
  const [tratadaFiltro, setTratadaFiltro] = useState<Set<string>>(new Set());
  const [ordenacao, setOrdenacao] = useState<{ coluna: ColunaId; desc: boolean }>({ coluna: "data", desc: true });
  const [selecionadoId, setSelecionadoId] = useState<string | "novo" | null>(null);
  const [desfazendo, setDesfazendo] = useState(false);

  const grupoMaisRecenteId = useMemo(() => {
    if (grupos.length === 0) return null;
    return grupos.reduce((mais, atual) => (atual.criado_em > mais.criado_em ? atual : mais)).ocorrencia_grupo_id;
  }, [grupos]);

  const causasDisponiveis = useMemo(
    () => Array.from(new Set(grupos.map((g) => g.enfermidade_descricao).filter((c): c is string => !!c))).sort(),
    [grupos],
  );

  function ordenarPor(coluna: ColunaId) {
    setOrdenacao((atual) => (atual.coluna === coluna ? { coluna, desc: !atual.desc } : { coluna, desc: false }));
  }

  const dados = useMemo(() => {
    const filtrados = grupos.filter((g) => {
      if (especiesFiltro.size > 0 && !especiesFiltro.has(g.especie)) return false;
      if (causasFiltro.size > 0 && (!g.enfermidade_descricao || !causasFiltro.has(g.enfermidade_descricao)))
        return false;
      if (tratadaFiltro.size > 0 && !tratadaFiltro.has(g.tratada ? "sim" : "nao")) return false;
      return true;
    });

    return [...filtrados].sort((a, b) => {
      const va = valorOrdenacao(a, ordenacao.coluna);
      const vb = valorOrdenacao(b, ordenacao.coluna);
      const cmp =
        typeof va === "number" && typeof vb === "number" ? va - vb : String(va).localeCompare(String(vb), "pt-BR");
      return ordenacao.desc ? -cmp : cmp;
    });
  }, [grupos, especiesFiltro, causasFiltro, tratadaFiltro, ordenacao]);

  const totalAnimais = useMemo(() => dados.reduce((soma, g) => soma + g.animais.length, 0), [dados]);
  const indiceQuantidade = colunas.findIndex((c) => c.id === "quantidade");

  const selecionado =
    selecionadoId === null
      ? null
      : selecionadoId === "novo"
        ? "novo"
        : (grupos.find((g) => g.ocorrencia_grupo_id === selecionadoId) ?? null);

  async function desfazer() {
    if (!confirm("Desfazer o registro de morte mais recente? Os animais voltam a ficar ativos.")) return;
    setDesfazendo(true);
    try {
      await desfazerUltimaMorte(localId);
    } catch (e) {
      alert(e instanceof Error ? e.message : "Não foi possível desfazer.");
    } finally {
      setDesfazendo(false);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div>
        <h1 className="text-xl font-semibold">Mortes</h1>
        <p className="text-sm text-muted-foreground">Registros de perda do rebanho.</p>
      </div>

      {podeEditar && (
        <div>
          <Button size="sm" onClick={() => setSelecionadoId("novo")}>
            <Plus className="size-4" />
            Registrar morte
          </Button>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <FiltroMultiSelecao
          rotulo="Todas as espécies"
          className="w-full md:w-auto"
          selecionados={especiesFiltro}
          onChange={setEspeciesFiltro}
          opcoes={Object.entries(rotulosEspecie).map(([value, label]) => ({ value, label }))}
        />
        <FiltroMultiSelecao
          rotulo="Todas as causas"
          className="w-full md:w-auto"
          selecionados={causasFiltro}
          onChange={setCausasFiltro}
          opcoes={causasDisponiveis.map((c) => ({ value: c, label: c }))}
        />
        <FiltroMultiSelecao
          rotulo="Tratada?"
          className="w-full md:w-auto"
          selecionados={tratadaFiltro}
          onChange={setTratadaFiltro}
          opcoes={[
            { value: "sim", label: "Sim" },
            { value: "nao", label: "Não" },
          ]}
        />
        <span className="text-sm text-muted-foreground">{dados.length} registro(s)</span>
      </div>

      {dados.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed py-12 text-muted-foreground">
          <Skull className="size-8" />
          <p>Nenhum registro de morte encontrado.</p>
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
              {podeEditar && <TableHead className="w-24" />}
            </TableRow>
          </TableHeader>
          <TableBody>
            {dados.map((g) => (
              <TableRow
                key={g.ocorrencia_grupo_id}
                className={podeEditar ? "cursor-pointer" : undefined}
                onClick={() => podeEditar && setSelecionadoId(g.ocorrencia_grupo_id)}
                title={g.animais.length > 0 ? `Animais: ${g.animais.map((a) => a.brinco ?? a.nome ?? a.tatuagem ?? "—").join(", ")}` : undefined}
              >
                <TableCell className="font-medium">{formatarData(g.data)}</TableCell>
                <TableCell>{g.descricao ?? "—"}</TableCell>
                <TableCell className="text-right tabular-nums">{g.animais.length}</TableCell>
                <TableCell>{g.enfermidade_descricao ?? "—"}</TableCell>
                <TableCell>
                  {g.tratada === null ? "—" : <Badge variant={g.tratada ? "secondary" : "outline"}>{g.tratada ? "Sim" : "Não"}</Badge>}
                </TableCell>
                {podeEditar && (
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    {g.ocorrencia_grupo_id === grupoMaisRecenteId && (
                      <Button variant="ghost" size="sm" disabled={desfazendo} onClick={desfazer}>
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
              <TableCell className="text-sm font-normal text-muted-foreground">
                {dados.length} {dados.length === 1 ? "registro" : "registros"}
              </TableCell>
              <TableCell colSpan={indiceQuantidade - 1} className="text-right font-medium">
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
        <DialogoMorte
          key={selecionadoId ?? "fechado"}
          localId={localId}
          grupo={selecionado}
          animaisAtivos={animaisAtivos}
          enfermidades={enfermidades}
          onFechar={() => setSelecionadoId(null)}
        />
      )}
    </div>
  );
}
