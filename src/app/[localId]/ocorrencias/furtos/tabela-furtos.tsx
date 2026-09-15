"use client";

import { useMemo, useState } from "react";
import { Plus, ShieldAlert, ArrowUp, ArrowDown, ArrowUpDown } from "lucide-react";
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
import { DialogoFurto } from "./dialogo-furto";
import type { AnimalAtivo, Especie, RegistroFurto } from "./page";

const rotulosEspecie: Record<Especie, string> = { bovino: "Bovino", ovino: "Ovino", equino: "Equino" };

function formatarData(data: string) {
  return new Date(data + "T00:00:00").toLocaleDateString("pt-BR");
}

type ColunaId = "data" | "descricao" | "quantidade" | "ocorrencia" | "responsavel";

const colunas: { id: ColunaId; rotulo: string; alinhamento?: "right" }[] = [
  { id: "data", rotulo: "Data" },
  { id: "descricao", rotulo: "Descrição" },
  { id: "quantidade", rotulo: "Quantidade", alinhamento: "right" },
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
  animaisAtivos: AnimalAtivo[];
  podeEditar: boolean;
};

export function TabelaFurtos({ localId, registros, animaisAtivos, podeEditar }: Props) {
  const [especiesFiltro, setEspeciesFiltro] = useState<Set<string>>(new Set());
  const [ordenacao, setOrdenacao] = useState<{ coluna: ColunaId; desc: boolean }>({ coluna: "data", desc: true });
  const [selecionadoId, setSelecionadoId] = useState<string | "novo" | null>(null);

  function ordenarPor(coluna: ColunaId) {
    setOrdenacao((atual) => (atual.coluna === coluna ? { coluna, desc: !atual.desc } : { coluna, desc: false }));
  }

  const dados = useMemo(() => {
    const filtrados = registros.filter((r) => {
      if (especiesFiltro.size > 0 && !especiesFiltro.has(r.especie)) return false;
      return true;
    });

    return [...filtrados].sort((a, b) => {
      const va = valorOrdenacao(a, ordenacao.coluna);
      const vb = valorOrdenacao(b, ordenacao.coluna);
      const cmp =
        typeof va === "number" && typeof vb === "number" ? va - vb : String(va).localeCompare(String(vb), "pt-BR");
      return ordenacao.desc ? -cmp : cmp;
    });
  }, [registros, especiesFiltro, ordenacao]);

  const selecionado =
    selecionadoId === null
      ? null
      : selecionadoId === "novo"
        ? "novo"
        : (registros.find((r) => r.id === selecionadoId) ?? null);

  const totalAnimais = useMemo(() => dados.reduce((soma, r) => soma + r.animais.length, 0), [dados]);
  const indiceQuantidade = colunas.findIndex((c) => c.id === "quantidade");

  return (
    <div className="flex flex-col gap-3">
      <div>
        <h1 className="text-xl font-semibold">Furtos</h1>
        <p className="text-sm text-muted-foreground">Registros de roubo/furto do rebanho.</p>
      </div>

      {podeEditar && (
        <div>
          <Button size="sm" onClick={() => setSelecionadoId("novo")}>
            <Plus className="size-4" />
            Registrar furto
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
        <span className="text-sm text-muted-foreground">{dados.length} registro(s)</span>
      </div>

      {dados.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed py-12 text-muted-foreground">
          <ShieldAlert className="size-8" />
          <p>Nenhum registro de furto encontrado.</p>
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
              {podeEditar && <TableHead className="w-10" />}
            </TableRow>
          </TableHeader>
          <TableBody>
            {dados.map((r) => (
              <TableRow
                key={r.id}
                className={podeEditar ? "cursor-pointer" : undefined}
                onClick={() => podeEditar && setSelecionadoId(r.id)}
                title={r.animais.length > 0 ? `Animais: ${r.animais.map((a) => a.brinco ?? a.nome ?? a.tatuagem ?? "—").join(", ")}` : undefined}
              >
                <TableCell className="font-medium">{formatarData(r.data)}</TableCell>
                <TableCell>{r.descricao ?? "—"}</TableCell>
                <TableCell className="text-right tabular-nums">{r.animais.length}</TableCell>
                <TableCell className="max-w-64 truncate">{r.ocorrencia ?? "—"}</TableCell>
                <TableCell>{r.responsavel ?? "—"}</TableCell>
                {podeEditar && <TableCell />}
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
        <DialogoFurto
          key={selecionadoId ?? "fechado"}
          localId={localId}
          registro={selecionado}
          animaisAtivos={animaisAtivos}
          onFechar={() => setSelecionadoId(null)}
        />
      )}
    </div>
  );
}
