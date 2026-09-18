"use client";

import { useMemo, useState, useActionState, useEffect } from "react";
import { Plus, Trash2, Pill, ArrowUp, ArrowDown, ArrowUpDown } from "lucide-react";
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
import { salvarMedicamento, apagarMedicamento } from "@/lib/actions/medicamentos";
import type { Medicamento } from "./page";

const rotulosStatus: Record<string, string> = { ativo: "Ativo", inativo: "Inativo" };

type ColunaId = "descricao" | "marca" | "principioAtivo" | "dosagem" | "status";

const colunas: { id: ColunaId; rotulo: string }[] = [
  { id: "descricao", rotulo: "Nome" },
  { id: "marca", rotulo: "Marca" },
  { id: "principioAtivo", rotulo: "Princípio ativo" },
  { id: "dosagem", rotulo: "Dosagem" },
  { id: "status", rotulo: "Status" },
];

function valorOrdenacao(m: Medicamento, coluna: ColunaId): string | number {
  switch (coluna) {
    case "descricao":
      return m.descricao.toLowerCase();
    case "marca":
      return (m.marca ?? "").toLowerCase();
    case "principioAtivo":
      return (m.principio_ativo ?? "").toLowerCase();
    case "dosagem":
      return (m.dosagem ?? "").toLowerCase();
    case "status":
      return m.ativo ? 0 : 1;
  }
}

type Props = {
  localId: string;
  medicamentos: Medicamento[];
  podeEditar: boolean;
};

export function ListaMedicamentos({ localId, medicamentos, podeEditar }: Props) {
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
    const filtrados = medicamentos.filter((m) => {
      if (statusFiltro.size > 0 && !statusFiltro.has(m.ativo ? "ativo" : "inativo")) return false;
      if (!buscaMin) return true;
      return [m.descricao, m.marca, m.principio_ativo, m.dosagem, m.observacoes]
        .filter(Boolean)
        .some((texto) => texto!.toLowerCase().includes(buscaMin));
    });

    return [...filtrados].sort((a, b) => {
      const va = valorOrdenacao(a, ordenacao.coluna);
      const vb = valorOrdenacao(b, ordenacao.coluna);
      const cmp =
        typeof va === "number" && typeof vb === "number" ? va - vb : String(va).localeCompare(String(vb), "pt-BR");
      return ordenacao.desc ? -cmp : cmp;
    });
  }, [medicamentos, busca, statusFiltro, ordenacao]);

  const selecionado =
    selecionadoId === null
      ? null
      : selecionadoId === "novo"
        ? "novo"
        : (medicamentos.find((m) => m.id === selecionadoId) ?? null);

  async function excluir(id: string) {
    if (!confirm("Apagar este medicamento?")) return;
    try {
      const resultado = await apagarMedicamento(localId, id);
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
            Novo medicamento
          </Button>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <Input
          placeholder="Buscar por nome, marca, princípio ativo ou dosagem..."
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
        <span className="text-sm text-muted-foreground">{dados.length} medicamento(s)</span>
      </div>

      {dados.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed py-12 text-muted-foreground">
          <Pill className="size-8" />
          <p>Nenhum medicamento encontrado.</p>
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
            {dados.map((m) => (
              <TableRow
                key={m.id}
                className={podeEditar ? "cursor-pointer" : undefined}
                onClick={() => podeEditar && setSelecionadoId(m.id)}
              >
                <TableCell className="font-medium">{m.descricao}</TableCell>
                <TableCell>{m.marca ?? "—"}</TableCell>
                <TableCell>{m.principio_ativo ?? "—"}</TableCell>
                <TableCell>{m.dosagem ?? "—"}</TableCell>
                <TableCell>
                  <Badge variant={m.ativo ? "secondary" : "outline"}>{m.ativo ? "Ativo" : "Inativo"}</Badge>
                </TableCell>
                {podeEditar && (
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-7 text-destructive"
                      title="Apagar"
                      onClick={() => excluir(m.id)}
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
                {dados.length} {dados.length === 1 ? "medicamento" : "medicamentos"}
              </TableCell>
              {podeEditar && <TableCell />}
            </TableRow>
          </TableFooter>
        </Table>
      )}

      {podeEditar && (
        <DialogoMedicamento
          key={selecionadoId ?? "fechado"}
          localId={localId}
          medicamento={selecionado}
          onFechar={() => setSelecionadoId(null)}
        />
      )}
    </div>
  );
}

function DialogoMedicamento({
  localId,
  medicamento,
  onFechar,
}: {
  localId: string;
  medicamento: Medicamento | "novo" | null;
  onFechar: () => void;
}) {
  const [resultado, acao, emAndamento] = useActionState(salvarMedicamento, undefined);
  const existente = medicamento && medicamento !== "novo" ? medicamento : null;
  const [ativo, setAtivo] = useState(existente?.ativo ?? true);

  useEffect(() => {
    if (resultado !== undefined && !resultado.erro) onFechar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resultado]);

  return (
    <Dialog open={medicamento !== null} onOpenChange={(aberto) => !aberto && onFechar()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{existente ? "Editar medicamento" : "Novo medicamento"}</DialogTitle>
        </DialogHeader>
        {medicamento && (
          <form key={existente?.id ?? "novo"} action={acao} className="flex flex-col gap-4">
            <input type="hidden" name="localId" value={localId} />
            {existente && <input type="hidden" name="id" value={existente.id} />}
            <div className="flex flex-col gap-2">
              <Label htmlFor="descricao">Nome</Label>
              <Input
                id="descricao"
                name="descricao"
                required
                autoFocus
                defaultValue={existente?.descricao}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="marca">Marca</Label>
                <Input id="marca" name="marca" defaultValue={existente?.marca ?? ""} />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="principioAtivo">Princípio ativo</Label>
                <Input id="principioAtivo" name="principioAtivo" defaultValue={existente?.principio_ativo ?? ""} />
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="dosagem">Dosagem</Label>
              <Input
                id="dosagem"
                name="dosagem"
                placeholder="Ex.: 1 mL a cada 50 kg"
                defaultValue={existente?.dosagem ?? ""}
              />
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
              <Label htmlFor="ativo">Medicamento ativo</Label>
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
