"use client";

import { useMemo, useState } from "react";
import { Undo2, Utensils, ArrowUp, ArrowDown, ArrowUpDown } from "lucide-react";
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
import { TabelaResumo, contar } from "@/components/tabela-resumo";
import { CartoesResumo, usePeriodo, type CicloPeriodo } from "@/components/filtro-periodo";
import { identificacaoAnimal } from "@/components/card-selecao-animais";
import { desfazerUltimoConsumo } from "@/lib/actions/consumo";
import { DialogoConsumo } from "./dialogo-consumo";
import type { Especie, GrupoConsumo } from "./page";

const rotulosEspecie: Record<Especie, string> = { bovino: "Bovino", ovino: "Ovino", equino: "Equino" };

function formatarData(data: string) {
  return new Date(data + "T00:00:00").toLocaleDateString("pt-BR");
}

function formatarPeso(peso: number | null) {
  return peso !== null ? `${peso.toLocaleString("pt-BR")} kg` : "—";
}

type ColunaId = "data" | "descricao" | "quantidade" | "pesoVivo" | "pesoCarne" | "destino";

const colunas: { id: ColunaId; rotulo: string; alinhamento?: "right" }[] = [
  { id: "data", rotulo: "Data" },
  { id: "descricao", rotulo: "Descrição" },
  { id: "quantidade", rotulo: "Animais", alinhamento: "right" },
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
  ciclo: CicloPeriodo;
  podeEditar: boolean;
};

export function TabelaConsumo({ localId, grupos, ciclo, podeEditar }: Props) {
  const { dentro, seletor } = usePeriodo(ciclo);
  const [especiesFiltro, setEspeciesFiltro] = useState<Set<string>>(new Set());
  const [destinosFiltro, setDestinosFiltro] = useState<Set<string>>(new Set());
  const [ordenacao, setOrdenacao] = useState<{ coluna: ColunaId; desc: boolean }>({ coluna: "data", desc: true });
  const [selecionadoId, setSelecionadoId] = useState<string | null>(null);
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
      if (!dentro(g.data)) return false;
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
  }, [grupos, dentro, especiesFiltro, destinosFiltro, ordenacao]);

  const selecionado = selecionadoId === null ? null : (grupos.find((g) => g.ocorrencia_grupo_id === selecionadoId) ?? null);

  // Resumos no mesmo recorte da tabela, animal por animal.
  const resumo = useMemo(
    () => ({
      animais: dados.reduce((s, g) => s + g.animais.length, 0),
      pesoVivo: dados.reduce((s, g) => s + (g.peso_vivo ?? 0), 0),
      pesoCarne: dados.reduce((s, g) => s + (g.peso_carne ?? 0), 0),
      porCategoria: contar(dados.flatMap((g) => g.animais.map((a) => a.categoria_descricao))),
      porDestino: contar(dados.flatMap((g) => g.animais.map(() => g.destino ?? "Não informado"))),
    }),
    [dados],
  );

  async function desfazer() {
    if (!confirm("Desfazer o registro de consumo mais recente? Os animais voltam a ficar ativos.")) return;
    setDesfazendo(true);
    try {
      const resultado = await desfazerUltimoConsumo(localId);
      if (resultado.error) alert(resultado.error);
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

      <div className="flex flex-wrap items-center gap-2">
        {seletor}
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
      </div>

      <CartoesResumo
        itens={[
          { rotulo: "Registros", valor: dados.length },
          { rotulo: "Animais consumidos", valor: resumo.animais },
          { rotulo: "Peso vivo", valor: formatarPeso(resumo.pesoVivo) },
          { rotulo: "Peso de carne", valor: formatarPeso(resumo.pesoCarne) },
        ]}
      />

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <TabelaResumo titulo="Consumo por categoria" linhas={resumo.porCategoria} />
        <TabelaResumo titulo="Consumo por destino" linhas={resumo.porDestino} />
      </div>

      {dados.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed py-12 text-muted-foreground">
          <Utensils className="size-8" />
          <p>Nenhum registro de consumo no período.</p>
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
                {podeEditar && <TableHead className="w-24" />}
              </TableRow>
            </TableHeader>
            <TableBody>
              {dados.map((g) => (
                <TableRow
                  key={g.ocorrencia_grupo_id}
                  className={podeEditar ? "cursor-pointer" : undefined}
                  onClick={() => podeEditar && setSelecionadoId(g.ocorrencia_grupo_id)}
                  title={`Animais: ${g.animais.map((a) => identificacaoAnimal(a)).join(", ")}`}
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
                <TableCell className="text-right font-medium tabular-nums">{resumo.animais}</TableCell>
                <TableCell className="text-right font-medium tabular-nums">{formatarPeso(resumo.pesoVivo)}</TableCell>
                <TableCell className="text-right font-medium tabular-nums">{formatarPeso(resumo.pesoCarne)}</TableCell>
                <TableCell />
                {podeEditar && <TableCell />}
              </TableRow>
            </TableFooter>
          </Table>
        </div>
      )}

      {podeEditar && <DialogoConsumo localId={localId} grupo={selecionado} onFechar={() => setSelecionadoId(null)} />}
    </div>
  );
}
