"use client";

import { useMemo, useState } from "react";
import { Undo2, ArrowLeftRight, ArrowUp, ArrowDown, ArrowUpDown, ChevronDown, ChevronRight } from "lucide-react";
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
import { desfazerUltimaTrocaCategoria } from "@/lib/actions/trocas";
import type { GrupoTroca } from "./page";

function formatarData(data: string) {
  return new Date(data + "T00:00:00").toLocaleDateString("pt-BR");
}

// Dentro de um grupo, todos os animais vão pro mesmo destino (é como esta
// tela grava), mas a origem pode variar se o usuário misturou animais de
// categorias diferentes na mesma seleção.
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
  { id: "quantidade", rotulo: "Quantidade", alinhamento: "right" },
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

type Props = {
  localId: string;
  grupos: GrupoTroca[];
  podeEditar: boolean;
};

export function HistoricoTrocas({ localId, grupos, podeEditar }: Props) {
  const [ordenacao, setOrdenacao] = useState<{ coluna: ColunaId; desc: boolean }>({ coluna: "data", desc: true });
  const [desfazendo, setDesfazendo] = useState(false);
  // Recolhido por padrão: essa tela pode ter mais de mil animais na tabela
  // de trocar categoria logo abaixo — o histórico não deveria disputar
  // espaço/rolagem com ela de cara.
  const [aberto, setAberto] = useState(false);

  const grupoMaisRecenteId = useMemo(() => {
    if (grupos.length === 0) return null;
    return grupos.reduce((mais, atual) => (atual.criado_em > mais.criado_em ? atual : mais)).troca_grupo_id;
  }, [grupos]);

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

  return (
    <div className="flex flex-col gap-3">
      <button
        type="button"
        onClick={() => setAberto((atual) => !atual)}
        className="flex items-center gap-2 text-left"
      >
        {aberto ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
        <div>
          <h2 className="text-lg font-semibold">Histórico de trocas ({grupos.length})</h2>
          {!aberto && (
            <p className="text-sm text-muted-foreground">
              Mudanças de categoria já confirmadas — clique pra expandir.
            </p>
          )}
        </div>
      </button>

      {aberto &&
        (dados.length === 0 ? (
          <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed py-12 text-muted-foreground">
            <ArrowLeftRight className="size-8" />
            <p>Nenhuma troca de categoria encontrada.</p>
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
                key={g.troca_grupo_id}
                title={g.animais.length > 0 ? `Animais: ${g.animais.map((a) => a.brinco ?? a.nome ?? a.tatuagem ?? "—").join(", ")}` : undefined}
              >
                <TableCell className="font-medium">{formatarData(g.data)}</TableCell>
                <TableCell>{g.descricao ?? "—"}</TableCell>
                <TableCell className="text-right tabular-nums">{g.animais.length}</TableCell>
                <TableCell>{categoriaUnica(g.animais.map((a) => a.categoria_origem_descricao))}</TableCell>
                <TableCell>{categoriaUnica(g.animais.map((a) => a.categoria_destino_descricao))}</TableCell>
                <TableCell>{g.responsavel ?? "—"}</TableCell>
                {podeEditar && (
                  <TableCell>
                    {g.troca_grupo_id === grupoMaisRecenteId && (
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
        ))}
    </div>
  );
}
