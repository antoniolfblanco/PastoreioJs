"use client";

import { Fragment, useMemo, useState } from "react";
import {
  Pencil,
  Trash2,
  ShoppingCart,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
  ChevronDown,
  ChevronRight,
  Calculator,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { CampoValorReais } from "@/components/campo-valor-reais";
import {
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import { apagarCompra, definirValorCompraAnimal, definirValorTotalCompra } from "@/lib/actions/compras";
import { DialogoEditarCompra } from "./dialogo-editar-compra";
import type { Compra } from "./page";

function formatarData(data: string | null) {
  return data ? new Date(data + "T00:00:00").toLocaleDateString("pt-BR") : "—";
}

function formatarReais(valor: number | null) {
  return valor != null ? valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) : "—";
}

type ColunaId = "data" | "descricao" | "fornecedor" | "quantidade" | "valor" | "pago";

const colunas: { id: ColunaId; rotulo: string; alinhamento?: "right" }[] = [
  { id: "data", rotulo: "Data" },
  { id: "descricao", rotulo: "Descrição" },
  { id: "fornecedor", rotulo: "Fornecedor" },
  { id: "quantidade", rotulo: "Quantidade", alinhamento: "right" },
  { id: "valor", rotulo: "Valor Total", alinhamento: "right" },
  { id: "pago", rotulo: "Pago" },
];

function valorOrdenacao(c: Compra, coluna: ColunaId): string | number {
  switch (coluna) {
    case "data":
      return c.data;
    case "descricao":
      return (c.descricao ?? "").toLowerCase();
    case "fornecedor":
      return (c.fornecedor ?? "").toLowerCase();
    case "quantidade":
      return c.animais.length;
    case "valor":
      return c.animais.reduce((s, a) => s + (a.valor_compra ?? 0), 0);
    case "pago":
      return c.pago ? 0 : 1;
  }
}

type Props = {
  localId: string;
  compras: Compra[];
  podeEditar: boolean;
};

export function HistoricoCompras({ localId, compras, podeEditar }: Props) {
  const [ordenacao, setOrdenacao] = useState<{ coluna: ColunaId; desc: boolean }>({ coluna: "data", desc: true });
  const [aberto, setAberto] = useState(false);
  const [expandidas, setExpandidas] = useState<Set<string>>(new Set());
  const [editando, setEditando] = useState<Compra | null>(null);
  const [definindoTotal, setDefinindoTotal] = useState<Compra | null>(null);
  const [definindoAnimal, setDefinindoAnimal] = useState<{ compraId: string; animalId: string; nome: string } | null>(
    null,
  );

  function ordenarPor(coluna: ColunaId) {
    setOrdenacao((atual) => (atual.coluna === coluna ? { coluna, desc: !atual.desc } : { coluna, desc: false }));
  }

  function alternarExpandida(id: string) {
    setExpandidas((atual) => {
      const novo = new Set(atual);
      if (novo.has(id)) novo.delete(id);
      else novo.add(id);
      return novo;
    });
  }

  const dados = useMemo(() => {
    return [...compras].sort((a, b) => {
      const va = valorOrdenacao(a, ordenacao.coluna);
      const vb = valorOrdenacao(b, ordenacao.coluna);
      const cmp =
        typeof va === "number" && typeof vb === "number" ? va - vb : String(va).localeCompare(String(vb), "pt-BR");
      return ordenacao.desc ? -cmp : cmp;
    });
  }, [compras, ordenacao]);

  const totalAnimais = useMemo(() => dados.reduce((s, c) => s + c.animais.length, 0), [dados]);
  const totalValor = useMemo(
    () => dados.reduce((s, c) => s + c.animais.reduce((s2, a) => s2 + (a.valor_compra ?? 0), 0), 0),
    [dados],
  );

  async function excluir(compra: Compra) {
    if (
      !confirm(
        `Apagar a compra "${compra.descricao ?? formatarData(compra.data)}"? Isso apaga também os ${compra.animais.length} animal(is) criados por ela.`,
      )
    )
      return;
    try {
      await apagarCompra(localId, compra.id);
    } catch (e) {
      alert(e instanceof Error ? e.message : "Não foi possível apagar.");
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <button type="button" onClick={() => setAberto((atual) => !atual)} className="flex items-center gap-2 text-left">
        {aberto ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
        <div>
          <h2 className="text-lg font-semibold">Histórico de compras ({compras.length})</h2>
          {!aberto && <p className="text-sm text-muted-foreground">Compras já registradas — clique pra expandir.</p>}
        </div>
      </button>

      {aberto &&
        (dados.length === 0 ? (
          <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed py-12 text-muted-foreground">
            <ShoppingCart className="size-8" />
            <p>Nenhuma compra registrada ainda.</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-8" />
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
                {podeEditar && <TableHead className="w-28" />}
              </TableRow>
            </TableHeader>
            <TableBody>
              {dados.map((c) => {
                const expandida = expandidas.has(c.id);
                const valorTotalCompra = c.animais.reduce((s, a) => s + (a.valor_compra ?? 0), 0);
                return (
                  <Fragment key={c.id}>
                    <TableRow className="cursor-pointer" onClick={() => alternarExpandida(c.id)}>
                      <TableCell>
                        {expandida ? (
                          <ChevronDown className="size-4 text-muted-foreground" />
                        ) : (
                          <ChevronRight className="size-4 text-muted-foreground" />
                        )}
                      </TableCell>
                      <TableCell className="font-medium">{formatarData(c.data)}</TableCell>
                      <TableCell>{c.descricao ?? "—"}</TableCell>
                      <TableCell>{c.fornecedor ?? "—"}</TableCell>
                      <TableCell className="text-right tabular-nums">{c.animais.length}</TableCell>
                      <TableCell className="text-right tabular-nums">{formatarReais(valorTotalCompra)}</TableCell>
                      <TableCell>
                        <Badge variant={c.pago ? "secondary" : "outline"}>{c.pago ? "Pago" : "Pendente"}</Badge>
                      </TableCell>
                      {podeEditar && (
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center gap-1">
                            <Button variant="ghost" size="icon" className="size-7" title="Editar" onClick={() => setEditando(c)}>
                              <Pencil className="size-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="size-7"
                              title="Definir valor total (rateado)"
                              onClick={() => setDefinindoTotal(c)}
                            >
                              <Calculator className="size-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="size-7 text-destructive"
                              title="Apagar"
                              onClick={() => excluir(c)}
                            >
                              <Trash2 className="size-4" />
                            </Button>
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                    {expandida && (
                      <TableRow className="bg-muted/30 hover:bg-muted/30">
                        <TableCell />
                        <TableCell colSpan={podeEditar ? 6 : 5}>
                          <div className="flex flex-col gap-1 py-1">
                            {c.animais.map((a) => (
                              <div key={a.id} className="flex items-center justify-between gap-2 text-sm">
                                <span className="text-muted-foreground">
                                  {a.identificacao} <span className="text-xs">({a.categoria_descricao})</span>
                                  {a.peso_compra != null && (
                                    <span className="text-xs"> — {a.peso_compra} kg</span>
                                  )}
                                </span>
                                <div className="flex items-center gap-1">
                                  <span className="tabular-nums">{formatarReais(a.valor_compra)}</span>
                                  {podeEditar && (
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="size-6"
                                      title="Definir valor"
                                      onClick={() =>
                                        setDefinindoAnimal({ compraId: c.id, animalId: a.id, nome: a.identificacao })
                                      }
                                    >
                                      <Pencil className="size-3.5" />
                                    </Button>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </Fragment>
                );
              })}
            </TableBody>
            <TableFooter>
              <TableRow>
                <TableCell />
                <TableCell colSpan={3} className="text-sm font-normal text-muted-foreground">
                  {dados.length} {dados.length === 1 ? "compra" : "compras"}
                </TableCell>
                <TableCell className="text-right font-medium tabular-nums">{totalAnimais}</TableCell>
                <TableCell className="text-right font-medium tabular-nums">{formatarReais(totalValor)}</TableCell>
                <TableCell />
                {podeEditar && <TableCell />}
              </TableRow>
            </TableFooter>
          </Table>
        ))}

      {podeEditar && (
        <DialogoEditarCompra localId={localId} compra={editando} onFechar={() => setEditando(null)} />
      )}

      <DialogoDefinirValorTotal
        localId={localId}
        compra={definindoTotal}
        onFechar={() => setDefinindoTotal(null)}
      />

      <DialogoDefinirValorAnimal
        localId={localId}
        alvo={definindoAnimal}
        onFechar={() => setDefinindoAnimal(null)}
      />
    </div>
  );
}

function DialogoDefinirValorTotal({
  localId,
  compra,
  onFechar,
}: {
  localId: string;
  compra: Compra | null;
  onFechar: () => void;
}) {
  return (
    <Dialog open={compra !== null} onOpenChange={(aberto) => !aberto && onFechar()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Definir valor total da compra</DialogTitle>
        </DialogHeader>
        {/* Chave no conteúdo, nunca no DialogContent: remontar o Popup no
            meio da própria transição de fechamento fazia a janela "voltar"
            — reabrir sozinha assim que o usuário confirmava. */}
        {compra && <ConteudoDefinirValorTotal key={compra.id} localId={localId} compra={compra} onFechar={onFechar} />}
      </DialogContent>
    </Dialog>
  );
}

function ConteudoDefinirValorTotal({
  localId,
  compra,
  onFechar,
}: {
  localId: string;
  compra: Compra;
  onFechar: () => void;
}) {
  const [valor, setValor] = useState("");
  const [emAndamento, setEmAndamento] = useState(false);
  const [erro, setErro] = useState<string | undefined>();

  async function confirmar() {
    const numero = Number(valor);
    if (!valor || Number.isNaN(numero) || numero < 0) {
      setErro("Informe um valor válido.");
      return;
    }
    setEmAndamento(true);
    setErro(undefined);
    try {
      await definirValorTotalCompra(localId, compra.id, numero);
      onFechar();
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Não foi possível salvar.");
    } finally {
      setEmAndamento(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-muted-foreground">
        Rateia o valor entre os {compra.animais.length} animais desta compra — por peso quando todos tiverem peso
        registrado, senão igual por cabeça.
      </p>
      <div className="flex flex-col gap-2">
        <Label htmlFor="valorTotalCompra">Valor total (R$)</Label>
        <CampoValorReais value={valor} onChange={setValor} />
      </div>
      {erro && <p className="text-sm text-destructive">{erro}</p>}
      <DialogFooter>
        <Button type="button" disabled={emAndamento} onClick={confirmar}>
          {emAndamento ? "Salvando..." : "Ratear"}
        </Button>
      </DialogFooter>
    </div>
  );
}

function DialogoDefinirValorAnimal({
  localId,
  alvo,
  onFechar,
}: {
  localId: string;
  alvo: { compraId: string; animalId: string; nome: string } | null;
  onFechar: () => void;
}) {
  return (
    <Dialog open={alvo !== null} onOpenChange={(aberto) => !aberto && onFechar()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Definir valor — {alvo?.nome}</DialogTitle>
        </DialogHeader>
        {alvo && <ConteudoDefinirValorAnimal key={alvo.animalId} localId={localId} alvo={alvo} onFechar={onFechar} />}
      </DialogContent>
    </Dialog>
  );
}

function ConteudoDefinirValorAnimal({
  localId,
  alvo,
  onFechar,
}: {
  localId: string;
  alvo: { compraId: string; animalId: string; nome: string };
  onFechar: () => void;
}) {
  const [valor, setValor] = useState("");
  const [emAndamento, setEmAndamento] = useState(false);
  const [erro, setErro] = useState<string | undefined>();

  async function confirmar() {
    const numero = Number(valor);
    if (!valor || Number.isNaN(numero) || numero < 0) {
      setErro("Informe um valor válido.");
      return;
    }
    setEmAndamento(true);
    setErro(undefined);
    try {
      await definirValorCompraAnimal(localId, alvo.animalId, numero);
      onFechar();
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Não foi possível salvar.");
    } finally {
      setEmAndamento(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor="valorAnimalCompra">Valor (R$)</Label>
        <CampoValorReais value={valor} onChange={setValor} />
      </div>
      {erro && <p className="text-sm text-destructive">{erro}</p>}
      <DialogFooter>
        <Button type="button" disabled={emAndamento} onClick={confirmar}>
          {emAndamento ? "Salvando..." : "Salvar"}
        </Button>
      </DialogFooter>
    </div>
  );
}
