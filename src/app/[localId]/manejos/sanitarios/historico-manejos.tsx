"use client";

import { useMemo, useState } from "react";
import { Pencil, Trash2, Stethoscope, ArrowUp, ArrowDown, ArrowUpDown, ChevronDown, ChevronRight } from "lucide-react";
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
import { apagarManejoSanitario } from "@/lib/actions/manejos-sanitarios";
import { DialogoEditarManejo } from "./dialogo-editar-manejo";
import type { AnimalManejo, GrupoManejo, OpcaoArea, OpcaoMedicamento } from "./page";

function formatarData(data: string) {
  return new Date(data + "T00:00:00").toLocaleDateString("pt-BR");
}

type ColunaId = "data" | "descricao" | "quantidade" | "area" | "medicamentos" | "responsavel";

const colunas: { id: ColunaId; rotulo: string; alinhamento?: "right" }[] = [
  { id: "data", rotulo: "Data" },
  { id: "descricao", rotulo: "Descrição" },
  { id: "quantidade", rotulo: "Quantidade", alinhamento: "right" },
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

type Props = {
  localId: string;
  grupos: GrupoManejo[];
  animais: AnimalManejo[];
  areas: OpcaoArea[];
  medicamentos: OpcaoMedicamento[];
  podeEditar: boolean;
};

export function HistoricoManejos({ localId, grupos, animais, areas, medicamentos, podeEditar }: Props) {
  const [ordenacao, setOrdenacao] = useState<{ coluna: ColunaId; desc: boolean }>({ coluna: "data", desc: true });
  const [apagando, setApagando] = useState<string | null>(null);
  const [editando, setEditando] = useState<GrupoManejo | null>(null);
  // Recolhido por padrão: a tabela de animais logo abaixo pode ter mais de
  // mil linhas, o histórico não deveria disputar espaço com ela.
  const [aberto, setAberto] = useState(false);

  function ordenarPor(coluna: ColunaId) {
    setOrdenacao((atual) => (atual.coluna === coluna ? { coluna, desc: !atual.desc } : { coluna, desc: false }));
  }

  const dados = useMemo(() => {
    return [...grupos].sort((a, b) => {
      const va = valorOrdenacao(a, ordenacao.coluna);
      const vb = valorOrdenacao(b, ordenacao.coluna);
      const cmp =
        typeof va === "number" && typeof vb === "number" ? va - vb : String(va).localeCompare(String(vb), "pt-BR");
      return ordenacao.desc ? -cmp : cmp;
    });
  }, [grupos, ordenacao]);

  const totalAnimais = useMemo(() => dados.reduce((soma, g) => soma + g.animais.length, 0), [dados]);
  const indiceQuantidade = colunas.findIndex((c) => c.id === "quantidade");

  async function apagar(grupo: GrupoManejo) {
    if (!confirm("Apagar este manejo sanitário? Essa ação não pode ser desfeita.")) return;
    setApagando(grupo.id);
    try {
      await apagarManejoSanitario(localId, grupo.id);
    } catch (e) {
      alert(e instanceof Error ? e.message : "Não foi possível apagar.");
    } finally {
      setApagando(null);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <button type="button" onClick={() => setAberto((atual) => !atual)} className="flex items-center gap-2 text-left">
        {aberto ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
        <div>
          <h2 className="text-lg font-semibold">Histórico de manejos ({grupos.length})</h2>
          {!aberto && (
            <p className="text-sm text-muted-foreground">Manejos sanitários já registrados — clique pra expandir.</p>
          )}
        </div>
      </button>

      {aberto &&
        (dados.length === 0 ? (
          <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed py-12 text-muted-foreground">
            <Stethoscope className="size-8" />
            <p>Nenhum manejo sanitário encontrado.</p>
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
                {podeEditar && <TableHead className="w-40" />}
              </TableRow>
            </TableHeader>
            <TableBody>
              {dados.map((g) => (
                <TableRow
                  key={g.id}
                  title={g.animais.length > 0 ? `Animais: ${g.animais.map((a) => a.brinco ?? a.nome ?? a.tatuagem ?? "—").join(", ")}` : undefined}
                >
                  <TableCell className="font-medium">{formatarData(g.data)}</TableCell>
                  <TableCell>{g.descricao ?? "—"}</TableCell>
                  <TableCell className="text-right tabular-nums">{g.animais.length}</TableCell>
                  <TableCell>{g.area_nome ?? "—"}</TableCell>
                  <TableCell>{g.medicamentos.length > 0 ? g.medicamentos.join(", ") : "—"}</TableCell>
                  <TableCell>{g.responsavel ?? "—"}</TableCell>
                  {podeEditar && (
                    <TableCell className="flex items-center gap-1">
                      <Button variant="ghost" size="sm" onClick={() => setEditando(g)}>
                        <Pencil className="size-4" />
                        Editar
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={apagando === g.id}
                        onClick={() => apagar(g)}
                      >
                        <Trash2 className="size-4" />
                        Apagar
                      </Button>
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
        ))}

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
