"use client";

import { useMemo, useState, useActionState, useEffect } from "react";
import { Plus, Trash2, MapPin, ArrowUp, ArrowDown, ArrowUpDown } from "lucide-react";
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
import { salvarArea, apagarArea } from "@/lib/actions/areas";
import type { Area } from "./page";

const rotulosStatus: Record<string, string> = { ativa: "Ativa", inativa: "Inativa" };

function formatarTamanho(tamanho: number | null) {
  return tamanho !== null ? `${tamanho} ha` : "—";
}

type ColunaId = "nome" | "tipo" | "tamanho" | "status";

const colunas: { id: ColunaId; rotulo: string; alinhamento?: "right" }[] = [
  { id: "nome", rotulo: "Nome" },
  { id: "tipo", rotulo: "Tipo" },
  { id: "tamanho", rotulo: "Tamanho", alinhamento: "right" },
  { id: "status", rotulo: "Status" },
];

function valorOrdenacao(a: Area, coluna: ColunaId): string | number {
  switch (coluna) {
    case "nome":
      return a.nome.toLowerCase();
    case "tipo":
      return (a.tipo ?? "").toLowerCase();
    case "tamanho":
      return a.tamanho ?? -Infinity;
    case "status":
      return a.ativo ? 0 : 1;
  }
}

type Props = {
  localId: string;
  areas: Area[];
  podeEditar: boolean;
};

export function ListaAreas({ localId, areas, podeEditar }: Props) {
  const [busca, setBusca] = useState("");
  const [tiposFiltro, setTiposFiltro] = useState<Set<string>>(new Set());
  const [statusFiltro, setStatusFiltro] = useState<Set<string>>(new Set());
  const [ordenacao, setOrdenacao] = useState<{ coluna: ColunaId; desc: boolean }>({
    coluna: "nome",
    desc: false,
  });
  const [selecionadoId, setSelecionadoId] = useState<string | "novo" | null>(null);

  const tiposDisponiveis = useMemo(
    () => Array.from(new Set(areas.map((a) => a.tipo).filter((t): t is string => !!t))).sort(),
    [areas],
  );

  function ordenarPor(coluna: ColunaId) {
    setOrdenacao((atual) => (atual.coluna === coluna ? { coluna, desc: !atual.desc } : { coluna, desc: false }));
  }

  const dados = useMemo(() => {
    const buscaMin = busca.trim().toLowerCase();
    const filtrados = areas.filter((a) => {
      if (tiposFiltro.size > 0 && (!a.tipo || !tiposFiltro.has(a.tipo))) return false;
      if (statusFiltro.size > 0 && !statusFiltro.has(a.ativo ? "ativa" : "inativa")) return false;
      if (!buscaMin) return true;
      return [a.nome, a.tipo, a.observacoes].filter(Boolean).some((texto) => texto!.toLowerCase().includes(buscaMin));
    });

    return [...filtrados].sort((a, b) => {
      const va = valorOrdenacao(a, ordenacao.coluna);
      const vb = valorOrdenacao(b, ordenacao.coluna);
      const cmp =
        typeof va === "number" && typeof vb === "number" ? va - vb : String(va).localeCompare(String(vb), "pt-BR");
      return ordenacao.desc ? -cmp : cmp;
    });
  }, [areas, busca, tiposFiltro, statusFiltro, ordenacao]);

  const totalTamanho = useMemo(() => dados.reduce((soma, a) => soma + (a.tamanho ?? 0), 0), [dados]);
  const indiceTamanho = colunas.findIndex((c) => c.id === "tamanho");

  const selecionado =
    selecionadoId === null
      ? null
      : selecionadoId === "novo"
        ? "novo"
        : (areas.find((a) => a.id === selecionadoId) ?? null);

  async function excluir(id: string) {
    if (!confirm("Apagar esta área?")) return;
    try {
      const resultado = await apagarArea(localId, id);
      if (resultado.error) alert(resultado.error);
    } catch (e) {
      alert(e instanceof Error ? e.message : "Não foi possível apagar.");
    }
  }

  return (
    <div className="flex flex-col gap-3">
      {podeEditar && (
        <div>
          <Button size="sm" onClick={() => setSelecionadoId("novo")}>
            <Plus className="size-4" />
            Nova área
          </Button>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <Input
          placeholder="Buscar por nome, tipo ou observações..."
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          className="w-full md:max-w-64"
        />
        <FiltroMultiSelecao
          rotulo="Todos os tipos"
          className="w-full md:w-auto"
          selecionados={tiposFiltro}
          onChange={setTiposFiltro}
          opcoes={tiposDisponiveis.map((t) => ({ value: t, label: t }))}
        />
        <FiltroMultiSelecao
          rotulo="Todos os status"
          className="w-full md:w-auto"
          selecionados={statusFiltro}
          onChange={setStatusFiltro}
          opcoes={Object.entries(rotulosStatus).map(([value, label]) => ({ value, label }))}
        />
        <span className="text-sm text-muted-foreground">{dados.length} área(s)</span>
      </div>

      {dados.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed py-12 text-muted-foreground">
          <MapPin className="size-8" />
          <p>Nenhuma área encontrada.</p>
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
            {dados.map((a) => (
              <TableRow
                key={a.id}
                className={podeEditar ? "cursor-pointer" : undefined}
                onClick={() => podeEditar && setSelecionadoId(a.id)}
              >
                <TableCell className="font-medium">{a.nome}</TableCell>
                <TableCell>{a.tipo ?? "—"}</TableCell>
                <TableCell className="text-right tabular-nums">{formatarTamanho(a.tamanho)}</TableCell>
                <TableCell>
                  <Badge variant={a.ativo ? "secondary" : "outline"}>{a.ativo ? "Ativa" : "Inativa"}</Badge>
                </TableCell>
                {podeEditar && (
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-7 text-destructive"
                      title="Apagar"
                      onClick={() => excluir(a.id)}
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
              <TableCell className="text-sm font-normal text-muted-foreground">
                {dados.length} {dados.length === 1 ? "área" : "áreas"}
              </TableCell>
              <TableCell colSpan={indiceTamanho - 1} className="text-right font-medium">
                Total
              </TableCell>
              <TableCell className="text-right font-medium tabular-nums">{formatarTamanho(totalTamanho)}</TableCell>
              <TableCell colSpan={colunas.length - indiceTamanho - 1} />
              {podeEditar && <TableCell />}
            </TableRow>
          </TableFooter>
        </Table>
      )}

      {podeEditar && (
        <DialogoArea
          // Sem key, o diálogo não remonta ao trocar de área e o useState de
          // "ativo" fica preso no valor da primeira montagem.
          key={selecionadoId ?? "fechado"}
          localId={localId}
          area={selecionado}
          onFechar={() => setSelecionadoId(null)}
        />
      )}
    </div>
  );
}

function DialogoArea({
  localId,
  area,
  onFechar,
}: {
  localId: string;
  area: Area | "novo" | null;
  onFechar: () => void;
}) {
  const [resultado, acao, emAndamento] = useActionState(salvarArea, undefined);
  const existente = area && area !== "novo" ? area : null;
  const [ativo, setAtivo] = useState(existente?.ativo ?? true);

  useEffect(() => {
    if (resultado !== undefined && !resultado.erro) onFechar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resultado]);

  return (
    <Dialog open={area !== null} onOpenChange={(aberto) => !aberto && onFechar()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{existente ? "Editar área" : "Nova área"}</DialogTitle>
        </DialogHeader>
        {area && (
          <form key={existente?.id ?? "novo"} action={acao} className="flex flex-col gap-4">
            <input type="hidden" name="localId" value={localId} />
            {existente && <input type="hidden" name="id" value={existente.id} />}
            <div className="flex flex-col gap-2">
              <Label htmlFor="nome">Nome</Label>
              <Input
                id="nome"
                name="nome"
                required
                autoFocus
                placeholder="Ex.: Piquete 3"
                defaultValue={existente?.nome}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="tipo">Tipo</Label>
                <Input id="tipo" name="tipo" placeholder="Ex.: Pasto" defaultValue={existente?.tipo ?? ""} />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="tamanho">Tamanho (ha)</Label>
                <Input
                  id="tamanho"
                  name="tamanho"
                  type="number"
                  step="0.01"
                  defaultValue={existente?.tamanho ?? ""}
                />
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="observacoes">Observações</Label>
              <Textarea id="observacoes" name="observacoes" defaultValue={existente?.observacoes ?? ""} />
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="ativo"
                name="ativo"
                checked={ativo}
                onCheckedChange={(v) => setAtivo(v === true)}
              />
              <Label htmlFor="ativo">Área ativa</Label>
            </div>
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
