"use client";

import { useMemo, useState } from "react";
import { ShieldAlert, ArrowUp, ArrowDown, ArrowUpDown } from "lucide-react";
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
import { opcoesArea, recortarPorArea } from "@/lib/filtro-area";
import { TabelaResumo, contar } from "@/components/tabela-resumo";
import { CartoesResumo, usePeriodo, type CicloPeriodo } from "@/components/filtro-periodo";
import { identificacaoAnimal } from "@/components/card-selecao-animais";
import { DialogoFurto } from "./dialogo-furto";
import type { Especie, RegistroFurto } from "./page";

const rotulosEspecie: Record<Especie, string> = { bovino: "Bovino", ovino: "Ovino", equino: "Equino" };

function formatarData(data: string) {
  return new Date(data + "T00:00:00").toLocaleDateString("pt-BR");
}

type ColunaId = "data" | "descricao" | "quantidade" | "ocorrencia" | "responsavel";

const colunas: { id: ColunaId; rotulo: string; alinhamento?: "right" }[] = [
  { id: "data", rotulo: "Data" },
  { id: "descricao", rotulo: "Descrição" },
  { id: "quantidade", rotulo: "Animais", alinhamento: "right" },
  { id: "ocorrencia", rotulo: "Ocorrência" },
  { id: "responsavel", rotulo: "Responsável" },
];

function valorOrdenacao(r: RegistroFurto, coluna: ColunaId): string | number {
  switch (coluna) {
    case "data":
      return r.data;
    case "descricao":
      return (r.descricao ?? "").toLowerCase();
    case "quantidade":
      return r.animais.length;
    case "ocorrencia":
      return (r.ocorrencia ?? "").toLowerCase();
    case "responsavel":
      return (r.responsavel ?? "").toLowerCase();
  }
}

type Props = {
  localId: string;
  registros: RegistroFurto[];
  ciclo: CicloPeriodo;
  podeEditar: boolean;
};

export function TabelaFurtos({ localId, registros, ciclo, podeEditar }: Props) {
  const { dentro, seletor } = usePeriodo(ciclo);
  const [especiesFiltro, setEspeciesFiltro] = useState<Set<string>>(new Set());
  const [areasFiltro, setAreasFiltro] = useState<Set<string>>(new Set());
  const areasDisponiveis = useMemo(() => opcoesArea(registros), [registros]);
  const [ordenacao, setOrdenacao] = useState<{ coluna: ColunaId; desc: boolean }>({ coluna: "data", desc: true });
  const [selecionadoId, setSelecionadoId] = useState<string | null>(null);

  function ordenarPor(coluna: ColunaId) {
    setOrdenacao((atual) => (atual.coluna === coluna ? { coluna, desc: !atual.desc } : { coluna, desc: false }));
  }

  const dados = useMemo(() => {
    const filtrados = recortarPorArea(registros, areasFiltro).filter(
      (r) => dentro(r.data) && (especiesFiltro.size === 0 || especiesFiltro.has(r.especie)),
    );
    return [...filtrados].sort((a, b) => {
      const va = valorOrdenacao(a, ordenacao.coluna);
      const vb = valorOrdenacao(b, ordenacao.coluna);
      const cmp =
        typeof va === "number" && typeof vb === "number" ? va - vb : String(va).localeCompare(String(vb), "pt-BR");
      return ordenacao.desc ? -cmp : cmp;
    });
  }, [registros, dentro, especiesFiltro, ordenacao, areasFiltro]);

  const selecionado = selecionadoId === null ? null : (registros.find((r) => r.id === selecionadoId) ?? null);

  const resumo = useMemo(() => {
    const animais = dados.flatMap((r) => r.animais);
    return {
      animais: animais.length,
      porCategoria: contar(animais.map((a) => a.categoria_descricao)),
      porArea: contar(animais.map((a) => a.area_nome)),
    };
  }, [dados]);

  return (
    <div className="flex flex-col gap-3">
      <div>
        <h1 className="text-xl font-semibold">Furtos</h1>
        <p className="text-sm text-muted-foreground">Registros de roubo/furto do rebanho.</p>
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
          rotulo="Todas as áreas"
          className="w-full md:w-auto"
          selecionados={areasFiltro}
          onChange={setAreasFiltro}
          opcoes={areasDisponiveis}
        />
      </div>

      <CartoesResumo
        itens={[
          { rotulo: "Registros", valor: dados.length },
          { rotulo: "Animais furtados", valor: resumo.animais },
        ]}
      />

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <TabelaResumo titulo="Furtos por categoria" linhas={resumo.porCategoria} />
        <TabelaResumo titulo="Furtos por área" linhas={resumo.porArea} />
      </div>

      {dados.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed py-12 text-muted-foreground">
          <ShieldAlert className="size-8" />
          <p>Nenhum registro de furto no período.</p>
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
              </TableRow>
            </TableHeader>
            <TableBody>
              {dados.map((r) => (
                <TableRow
                  key={r.id}
                  className={podeEditar ? "cursor-pointer" : undefined}
                  onClick={() => podeEditar && setSelecionadoId(r.id)}
                  title={r.animais.length > 0 ? `Animais: ${r.animais.map((a) => identificacaoAnimal(a)).join(", ")}` : undefined}
                >
                  <TableCell className="font-medium">{formatarData(r.data)}</TableCell>
                  <TableCell>{r.descricao ?? "—"}</TableCell>
                  <TableCell className="text-right tabular-nums">{r.animais.length}</TableCell>
                  <TableCell className="max-w-64 truncate">{r.ocorrencia ?? "—"}</TableCell>
                  <TableCell>{r.responsavel ?? "—"}</TableCell>
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
                <TableCell colSpan={2} />
              </TableRow>
            </TableFooter>
          </Table>
        </div>
      )}

      {podeEditar && <DialogoFurto localId={localId} registro={selecionado} onFechar={() => setSelecionadoId(null)} />}
    </div>
  );
}
