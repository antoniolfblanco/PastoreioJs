"use client";

import { Fragment, useMemo, useState } from "react";
import {
  Pencil,
  Trash2,
  DollarSign,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
  ChevronDown,
  ChevronRight,
  Calculator,
  ScaleIcon,
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
import { apagarVenda, definirValorTotalVenda, confirmarValorTotalVenda } from "@/lib/actions/vendas";
import { DialogoEditarVenda } from "./dialogo-editar-venda";
import type { Venda } from "./page";

function formatarData(data: string | null) {
  return data ? new Date(data + "T00:00:00").toLocaleDateString("pt-BR") : "—";
}

function formatarReais(valor: number | null) {
  return valor != null ? valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) : "—";
}

function valorAnimal(a: Venda["animais"][number]) {
  return a.valor_venda_definitivo ?? a.valor_venda_previsto;
}

type ColunaId = "data" | "descricao" | "comprador" | "quantidade" | "valor" | "recebido";

const colunas: { id: ColunaId; rotulo: string; alinhamento?: "right" }[] = [
  { id: "data", rotulo: "Data" },
  { id: "descricao", rotulo: "Descrição" },
  { id: "comprador", rotulo: "Comprador" },
  { id: "quantidade", rotulo: "Quantidade", alinhamento: "right" },
  { id: "valor", rotulo: "Valor Total", alinhamento: "right" },
  { id: "recebido", rotulo: "Recebido" },
];

function valorOrdenacao(v: Venda, coluna: ColunaId): string | number {
  switch (coluna) {
    case "data":
      return v.data;
    case "descricao":
      return (v.descricao ?? "").toLowerCase();
    case "comprador":
      return (v.comprador ?? "").toLowerCase();
    case "quantidade":
      return v.animais.length;
    case "valor":
      return v.animais.reduce((s, a) => s + (valorAnimal(a) ?? 0), 0);
    case "recebido":
      return v.recebido ? 0 : 1;
  }
}

type Props = {
  localId: string;
  vendas: Venda[];
  podeEditar: boolean;
};

export function HistoricoVendas({ localId, vendas, podeEditar }: Props) {
  const [ordenacao, setOrdenacao] = useState<{ coluna: ColunaId; desc: boolean }>({ coluna: "data", desc: true });
  const [aberto, setAberto] = useState(false);
  const [expandidas, setExpandidas] = useState<Set<string>>(new Set());
  const [editando, setEditando] = useState<Venda | null>(null);
  const [definindoTotal, setDefinindoTotal] = useState<Venda | null>(null);
  const [confirmandoRendimento, setConfirmandoRendimento] = useState<Venda | null>(null);

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
    return [...vendas].sort((a, b) => {
      const va = valorOrdenacao(a, ordenacao.coluna);
      const vb = valorOrdenacao(b, ordenacao.coluna);
      const cmp =
        typeof va === "number" && typeof vb === "number" ? va - vb : String(va).localeCompare(String(vb), "pt-BR");
      return ordenacao.desc ? -cmp : cmp;
    });
  }, [vendas, ordenacao]);

  const totalAnimais = useMemo(() => dados.reduce((s, v) => s + v.animais.length, 0), [dados]);
  const totalValor = useMemo(
    () => dados.reduce((s, v) => s + v.animais.reduce((s2, a) => s2 + (valorAnimal(a) ?? 0), 0), 0),
    [dados],
  );

  async function excluir(venda: Venda) {
    if (
      !confirm(
        `Apagar a venda "${venda.descricao ?? formatarData(venda.data)}"? Os ${venda.animais.length} animal(is) voltam pro rebanho ativo.`,
      )
    )
      return;
    try {
      const resultado = await apagarVenda(localId, venda.id);
      if (resultado.error) alert(resultado.error);
    } catch (e) {
      alert(e instanceof Error ? e.message : "Não foi possível apagar.");
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <button type="button" onClick={() => setAberto((atual) => !atual)} className="flex items-center gap-2 text-left">
        {aberto ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
        <div>
          <h2 className="text-lg font-semibold">Histórico de vendas ({vendas.length})</h2>
          {!aberto && <p className="text-sm text-muted-foreground">Vendas já registradas — clique pra expandir.</p>}
        </div>
      </button>

      {aberto &&
        (dados.length === 0 ? (
          <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed py-12 text-muted-foreground">
            <DollarSign className="size-8" />
            <p>Nenhuma venda registrada ainda.</p>
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
                {podeEditar && <TableHead className="w-36" />}
              </TableRow>
            </TableHeader>
            <TableBody>
              {dados.map((v) => {
                const expandida = expandidas.has(v.id);
                const valorTotalVenda = v.animais.reduce((s, a) => s + (valorAnimal(a) ?? 0), 0);
                const temPendenteRendimento = v.animais.some((a) => a.a_rendimento && a.valor_venda_definitivo == null);
                return (
                  <Fragment key={v.id}>
                    <TableRow className="cursor-pointer" onClick={() => alternarExpandida(v.id)}>
                      <TableCell>
                        {expandida ? (
                          <ChevronDown className="size-4 text-muted-foreground" />
                        ) : (
                          <ChevronRight className="size-4 text-muted-foreground" />
                        )}
                      </TableCell>
                      <TableCell className="font-medium">{formatarData(v.data)}</TableCell>
                      <TableCell>{v.descricao ?? "—"}</TableCell>
                      <TableCell>{v.comprador ?? "—"}</TableCell>
                      <TableCell className="text-right tabular-nums">{v.animais.length}</TableCell>
                      <TableCell className="text-right tabular-nums">{formatarReais(valorTotalVenda)}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5">
                          <Badge variant={v.recebido ? "secondary" : "outline"}>{v.recebido ? "Recebido" : "Pendente"}</Badge>
                          {temPendenteRendimento && (
                            <Badge variant="outline" title="Tem animal a rendimento aguardando valor definitivo">
                              A rendimento
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      {podeEditar && (
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center gap-1">
                            <Button variant="ghost" size="icon" className="size-7" title="Editar" onClick={() => setEditando(v)}>
                              <Pencil className="size-4" />
                            </Button>
                            {temPendenteRendimento && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="size-7"
                                title="Confirmar valor definitivo (a rendimento)"
                                onClick={() => setConfirmandoRendimento(v)}
                              >
                                <ScaleIcon className="size-4" />
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="icon"
                              className="size-7"
                              title="Definir valor total (rateado)"
                              onClick={() => setDefinindoTotal(v)}
                            >
                              <Calculator className="size-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="size-7 text-destructive"
                              title="Apagar"
                              onClick={() => excluir(v)}
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
                            {v.animais.map((a) => (
                              <div key={a.id} className="flex items-center justify-between gap-2 text-sm">
                                <span className="text-muted-foreground">
                                  {a.identificacao} <span className="text-xs">({a.categoria_descricao})</span>
                                  {a.peso_venda != null && <span className="text-xs"> — {a.peso_venda} kg</span>}
                                  {a.a_rendimento && <span className="text-xs"> — a rendimento</span>}
                                </span>
                                <span className="tabular-nums">{formatarReais(valorAnimal(a))}</span>
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
                  {dados.length} {dados.length === 1 ? "venda" : "vendas"}
                </TableCell>
                <TableCell className="text-right font-medium tabular-nums">{totalAnimais}</TableCell>
                <TableCell className="text-right font-medium tabular-nums">{formatarReais(totalValor)}</TableCell>
                <TableCell />
                {podeEditar && <TableCell />}
              </TableRow>
            </TableFooter>
          </Table>
        ))}

      {podeEditar && <DialogoEditarVenda localId={localId} venda={editando} onFechar={() => setEditando(null)} />}

      <DialogoValorTotal
        titulo="Definir valor total da venda"
        descricao="Rateia o valor entre todos os animais desta venda — por peso quando todos tiverem peso registrado, senão igual por cabeça."
        venda={definindoTotal}
        onFechar={() => setDefinindoTotal(null)}
        onConfirmar={(id, valor) => definirValorTotalVenda(localId, id, valor)}
      />

      <DialogoValorTotal
        titulo="Confirmar valor definitivo (a rendimento)"
        descricao="Rateia o valor só entre os animais a rendimento ainda pendentes, por peso de venda."
        venda={confirmandoRendimento}
        onFechar={() => setConfirmandoRendimento(null)}
        onConfirmar={(id, valor) => confirmarValorTotalVenda(localId, id, valor)}
      />
    </div>
  );
}

function DialogoValorTotal({
  titulo,
  descricao,
  venda,
  onFechar,
  onConfirmar,
}: {
  titulo: string;
  descricao: string;
  venda: Venda | null;
  onFechar: () => void;
  onConfirmar: (vendaId: string, valor: number) => Promise<{ error?: string }>;
}) {
  return (
    <Dialog open={venda !== null} onOpenChange={(aberto) => !aberto && onFechar()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{titulo}</DialogTitle>
        </DialogHeader>
        {/* Chave no conteúdo, nunca no DialogContent: remontar o Popup no
            meio da própria transição de fechamento fazia a janela "voltar"
            — reabrir sozinha assim que o usuário confirmava. */}
        {venda && (
          <ConteudoValorTotal
            key={venda.id}
            descricao={descricao}
            venda={venda}
            onFechar={onFechar}
            onConfirmar={onConfirmar}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function ConteudoValorTotal({
  descricao,
  venda,
  onFechar,
  onConfirmar,
}: {
  descricao: string;
  venda: Venda;
  onFechar: () => void;
  onConfirmar: (vendaId: string, valor: number) => Promise<{ error?: string }>;
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
      const resultado = await onConfirmar(venda.id, numero);
      if (resultado.error) {
        setErro(resultado.error);
        return;
      }
      onFechar();
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Não foi possível salvar.");
    } finally {
      setEmAndamento(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-muted-foreground">{descricao}</p>
      <div className="flex flex-col gap-2">
        <Label htmlFor="valorTotalVenda">Valor total (R$)</Label>
        <CampoValorReais value={valor} onChange={setValor} />
      </div>
      {erro && <p className="text-sm text-destructive">{erro}</p>}
      <DialogFooter>
        <Button type="button" disabled={emAndamento} onClick={confirmar}>
          {emAndamento ? "Salvando..." : "Confirmar"}
        </Button>
      </DialogFooter>
    </div>
  );
}
