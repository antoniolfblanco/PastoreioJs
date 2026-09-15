"use client";

import { useMemo, useState, useActionState, useEffect } from "react";
import { Plus, Trash2, Tag, ArrowUp, ArrowDown, ArrowUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
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
import { salvarRaca, apagarRaca } from "@/lib/actions/racas";
import type { Raca } from "./page";

const rotulosStatus: Record<string, string> = { ativa: "Ativa", inativa: "Inativa" };

type ColunaId = "descricao" | "status";

const colunas: { id: ColunaId; rotulo: string }[] = [
  { id: "descricao", rotulo: "Nome" },
  { id: "status", rotulo: "Status" },
];

function valorOrdenacao(r: Raca, coluna: ColunaId): string | number {
  switch (coluna) {
    case "descricao":
      return r.descricao.toLowerCase();
    case "status":
      return r.ativo ? 0 : 1;
  }
}

type Props = {
  localId: string;
  racas: Raca[];
  podeEditar: boolean;
};

export function ListaRacas({ localId, racas, podeEditar }: Props) {
  const [busca, setBusca] = useState("");
  const [statusFiltro, setStatusFiltro] = useState<Set<string>>(new Set());
  const [ordenacao, setOrdenacao] = useState<{ coluna: ColunaId; desc: boolean }>({
    coluna: "descricao",
    desc: false,
  });
  const [selecionadoId, setSelecionadoId] = useState<string | "novo" | null>(null);

  function ordenarPor(coluna: ColunaId) {
    setOrdenacao((atual) => (atual.coluna === coluna ? { coluna, desc: !atual.desc } : { coluna, desc: false }));
  }

  const dados = useMemo(() => {
    const buscaMin = busca.trim().toLowerCase();
    const filtrados = racas.filter((r) => {
      if (statusFiltro.size > 0 && !statusFiltro.has(r.ativo ? "ativa" : "inativa")) return false;
      if (!buscaMin) return true;
      return [r.descricao, r.observacoes].filter(Boolean).some((texto) => texto!.toLowerCase().includes(buscaMin));
    });

    return [...filtrados].sort((a, b) => {
      const va = valorOrdenacao(a, ordenacao.coluna);
      const vb = valorOrdenacao(b, ordenacao.coluna);
      const cmp =
        typeof va === "number" && typeof vb === "number" ? va - vb : String(va).localeCompare(String(vb), "pt-BR");
      return ordenacao.desc ? -cmp : cmp;
    });
  }, [racas, busca, statusFiltro, ordenacao]);

  const selecionado =
    selecionadoId === null
      ? null
      : selecionadoId === "novo"
        ? "novo"
        : (racas.find((r) => r.id === selecionadoId) ?? null);

  async function excluir(r: Raca) {
    if (!confirm(`Apagar a raça "${r.descricao}"?`)) return;
    try {
      await apagarRaca(localId, r.id);
    } catch (e) {
      alert(e instanceof Error ? e.message : "Não foi possível apagar — ela já pode ter sido usada em algum animal.");
    }
  }

  return (
    <div className="flex flex-col gap-3">
      {podeEditar && (
        <div>
          <Button size="sm" onClick={() => setSelecionadoId("novo")}>
            <Plus className="size-4" />
            Nova raça
          </Button>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <Input
          placeholder="Buscar por nome ou observações..."
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          className="w-full md:max-w-64"
        />
        <FiltroMultiSelecao
          rotulo="Todos os status"
          className="w-full md:w-auto"
          selecionados={statusFiltro}
          onChange={setStatusFiltro}
          opcoes={Object.entries(rotulosStatus).map(([value, label]) => ({ value, label }))}
        />
        <span className="text-sm text-muted-foreground">{dados.length} raça(s)</span>
      </div>

      {dados.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed py-12 text-muted-foreground">
          <Tag className="size-8" />
          <p>Nenhuma raça encontrada.</p>
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              {colunas.map((coluna) => (
                <TableHead key={coluna.id}>
                  <button
                    type="button"
                    onClick={() => ordenarPor(coluna.id)}
                    className="inline-flex items-center gap-1 hover:text-foreground"
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
              >
                <TableCell className="font-medium">
                  <div className="flex items-center gap-2">
                    {r.descricao}
                    {r.padrao && (
                      <Badge variant="outline" title="Usada quando nenhuma raça é informada">
                        Padrão
                      </Badge>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant={r.ativo ? "secondary" : "outline"}>{r.ativo ? "Ativa" : "Inativa"}</Badge>
                </TableCell>
                {podeEditar && (
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-7 text-destructive"
                      title="Apagar"
                      disabled={r.padrao}
                      onClick={() => excluir(r)}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
          <TableFooter>
            <TableRow>
              <TableCell colSpan={colunas.length} className="text-sm font-normal text-muted-foreground">
                {dados.length} {dados.length === 1 ? "raça" : "raças"}
              </TableCell>
              {podeEditar && <TableCell />}
            </TableRow>
          </TableFooter>
        </Table>
      )}

      {podeEditar && (
        <DialogoRaca
          key={selecionadoId ?? "fechado"}
          localId={localId}
          raca={selecionado}
          onFechar={() => setSelecionadoId(null)}
        />
      )}
    </div>
  );
}

function DialogoRaca({
  localId,
  raca,
  onFechar,
}: {
  localId: string;
  raca: Raca | "novo" | null;
  onFechar: () => void;
}) {
  const [resultado, acao, emAndamento] = useActionState(salvarRaca, undefined);
  const existente = raca && raca !== "novo" ? raca : null;
  const [ativo, setAtivo] = useState(existente?.ativo ?? true);

  useEffect(() => {
    if (resultado !== undefined && !resultado.erro) onFechar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resultado]);

  return (
    <Dialog open={raca !== null} onOpenChange={(aberto) => !aberto && onFechar()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{existente ? "Editar raça" : "Nova raça"}</DialogTitle>
        </DialogHeader>
        {raca && (
          <form key={existente?.id ?? "novo"} action={acao} className="flex flex-col gap-4">
            <input type="hidden" name="localId" value={localId} />
            {existente && <input type="hidden" name="id" value={existente.id} />}
            <div className="flex flex-col gap-2">
              <Label htmlFor="descricao">Nome</Label>
              <Input id="descricao" name="descricao" required autoFocus defaultValue={existente?.descricao} />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="observacoes">Observações</Label>
              <Textarea id="observacoes" name="observacoes" defaultValue={existente?.observacoes ?? ""} />
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="ativo"
                name={existente?.padrao ? undefined : "ativo"}
                checked={existente?.padrao ? true : ativo}
                onCheckedChange={(v) => setAtivo(v === true)}
                disabled={existente?.padrao}
              />
              <Label htmlFor="ativo">Raça ativa</Label>
              {existente?.padrao && <input type="hidden" name="ativo" value="on" />}
            </div>
            {existente?.padrao && (
              <p className="text-sm text-muted-foreground">
                Esta é a raça padrão do local (usada quando nenhuma é informada) — não pode ficar inativa nem ser
                apagada.
              </p>
            )}
            {resultado?.erro && <p className="text-sm text-destructive">{resultado.erro}</p>}
            <DialogFooter>
              <Button type="submit" disabled={emAndamento}>
                {emAndamento ? "Salvando..." : "Salvar"}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
