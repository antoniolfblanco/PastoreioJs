"use client";

import { useMemo, useState } from "react";
import { Plus, Undo2, Beef, ArrowUp, ArrowDown, ArrowUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
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
import { desfazerUltimoConsumo } from "@/lib/actions/consumo";
import { DialogoConsumo } from "./dialogo-consumo";
import type { AnimalAtivo, Especie, GrupoConsumo } from "./page";

const rotulosEspecie: Record<Especie, string> = { bovino: "Bovino", ovino: "Ovino", equino: "Equino" };

function formatarData(data: string) {
  return new Date(data + "T00:00:00").toLocaleDateString("pt-BR");
}

function formatarPeso(peso: number | null) {
  return peso !== null ? `${peso} kg` : "—";
}

type ColunaId = "data" | "descricao" | "quantidade" | "pesoVivo" | "pesoCarne" | "destino";

const colunas: { id: ColunaId; rotulo: string; alinhamento?: "right" }[] = [
  { id: "data", rotulo: "Data" },
  { id: "descricao", rotulo: "Descrição" },
  { id: "quantidade", rotulo: "Quantidade", alinhamento: "right" },
  { id: "pesoVivo", rotulo: "Peso vivo", alinhamento: "right" },
  { id: "pesoCarne", rotulo: "Peso carne", alinhamento: "right" },
  { id: "destino", rotulo: "Destino" },
];

function valorOrdenacao(g: GrupoConsumo, coluna: ColunaId): string | number {
  switch (coluna) {
    case "data":
      return g.data;
    case "descricao":
      return (g.descricao ?? "").toLowerCase();
    case "quantidade":
      return g.animais.length;
    case "pesoVivo":
      return g.peso_vivo ?? -Infinity;
    case "pesoCarne":
      return g.peso_carne ?? -Infinity;
    case "destino":
      return (g.destino ?? "").toLowerCase();
  }
}

type Props = {
  localId: string;
  grupos: GrupoConsumo[];
  animaisAtivos: AnimalAtivo[];
  podeEditar: boolean;
};

export function TabelaConsumo({ localId, grupos, animaisAtivos, podeEditar }: Props) {
  const [especiesFiltro, setEspeciesFiltro] = useState<Set<string>>(new Set());
  const [destinosFiltro, setDestinosFiltro] = useState<Set<string>>(new Set());
  const [ordenacao, setOrdenacao] = useState<{ coluna: ColunaId; desc: boolean }>({ coluna: "data", desc: true });
  const [selecionadoId, setSelecionadoId] = useState<string | "novo" | null>(null);
  const [desfazendo, setDesfazendo] = useState(false);

  const grupoMaisRecenteId = useMemo(() => {
    if (grupos.length === 0) return null;
    return grupos.reduce((mais, atual) => (atual.criado_em > mais.criado_em ? atual : mais)).ocorrencia_grupo_id;
  }, [grupos]);

  const destinosDisponiveis = useMemo(
    () => Array.from(new Set(grupos.map((g) => g.destino).filter((d): d is string => !!d))).sort(),
    [grupos],
  );

  function ordenarPor(coluna: ColunaId) {
    setOrdenacao((atual) => (atual.coluna === coluna ? { coluna, desc: !atual.desc } : { coluna, desc: false }));
  }

  const dados = useMemo(() => {
    const filtrados = grupos.filter((g) => {
      if (especiesFiltro.size > 0 && !especiesFiltro.has(g.especie)) return false;
      if (destinosFiltro.size > 0 && (!g.destino || !destinosFiltro.has(g.destino))) return false;
      return true;
    });

    return [...filtrados].sort((a, b) => {
      const va = valorOrdenacao(a, ordenacao.coluna);
      const vb = valorOrdenacao(b, ordenacao.coluna);
      const cmp =
        typeof va === "number" && typeof vb === "number" ? va - vb : String(va).localeCompare(String(vb), "pt-BR");
      return ordenacao.desc ? -cmp : cmp;
    });
  }, [grupos, especiesFiltro, destinosFiltro, ordenacao]);

  const selecionado =
    selecionadoId === null
      ? null
      : selecionadoId === "novo"
        ? "novo"
        : (grupos.find((g) => g.ocorrencia_grupo_id === selecionadoId) ?? null);

  const totalAnimais = useMemo(() => dados.reduce((soma, g) => soma + g.animais.length, 0), [dados]);
  const totalPesoVivo = useMemo(() => dados.reduce((soma, g) => soma + (g.peso_vivo ?? 0), 0), [dados]);
  const totalPesoCarne = useMemo(() => dados.reduce((soma, g) => soma + (g.peso_carne ?? 0), 0), [dados]);

  async function desfazer() {
    if (!confirm("Desfazer o registro de consumo mais recente? Os animais voltam a ficar ativos.")) return;
    setDesfazendo(true);
    try {
      await desfazerUltimoConsumo(localId);
    } catch (e) {
      alert(e instanceof Error ? e.message : "Não foi possível desfazer.");
    } finally {
      setDesfazendo(false);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div>
        <h1 className="text-xl font-semibold">Consumo</h1>
        <p className="text-sm text-muted-foreground">Abates para consumo próprio do rebanho.</p>
      </div>

      {podeEditar && (
        <div>
          <Button size="sm" onClick={() => setSelecionadoId("novo")}>
            <Plus className="size-4" />
            Registrar consumo
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
          rotulo="Todos os destinos"
          className="w-full md:w-auto"
          selecionados={destinosFiltro}
          onChange={setDestinosFiltro}
          opcoes={destinosDisponiveis.map((d) => ({ value: d, label: d }))}
        />
        <span className="text-sm text-muted-foreground">{dados.length} registro(s)</span>
      </div>

      {dados.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed py-12 text-muted-foreground">
          <Beef className="size-8" />
          <p>Nenhum registro de consumo encontrado.</p>
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
                <TableCell className="text-right tabular-nums">{formatarPeso(g.peso_vivo)}</TableCell>
                <TableCell className="text-right tabular-nums">{formatarPeso(g.peso_carne)}</TableCell>
                <TableCell>{g.destino ?? "—"}</TableCell>
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
              <TableCell className="text-right font-medium">Total</TableCell>
              <TableCell className="text-right font-medium tabular-nums">{totalAnimais}</TableCell>
              <TableCell className="text-right font-medium tabular-nums">{formatarPeso(totalPesoVivo)}</TableCell>
              <TableCell className="text-right font-medium tabular-nums">{formatarPeso(totalPesoCarne)}</TableCell>
              <TableCell />
              {podeEditar && <TableCell />}
            </TableRow>
          </TableFooter>
        </Table>
      )}

      {podeEditar && (
        <DialogoConsumo
          key={selecionadoId ?? "fechado"}
          localId={localId}
          grupo={selecionado}
          animaisAtivos={animaisAtivos}
          onFechar={() => setSelecionadoId(null)}
        />
      )}
    </div>
  );
}
